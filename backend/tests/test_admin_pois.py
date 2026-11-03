from contextlib import closing

import unittest
import test_admin_api
from app.db.connection import connect
from scripts.seed_db import stable_id


class PlaceAPITests(unittest.TestCase):
    setUp = test_admin_api.AdminAPITests.setUp
    login = test_admin_api.AdminAPITests.login
    headers = test_admin_api.AdminAPITests.headers
    def test_places_and_narrations(self):
        base = '/api/v1/admin/pois'
        body = {'category_id': stable_id('category:history'), 'name': 'Place', 'address': 'Address',
                'latitude': 10.7, 'longitude': 106.7, 'radius_m': 100, 'image_url': None}
        self.assertEqual(self.client.get(base).status_code, 401)
        headers = self.headers(self.login())
        created = self.client.post(base, json=body, headers=headers)
        self.assertEqual(created.status_code, 201, created.text)
        item = created.json()
        self.assertEqual(item['status'], 'draft')
        path = base + '/' + item['id']
        self.assertEqual(self.client.get(path, headers=headers).json()['name'], 'Place')
        self.assertEqual(self.client.get('/api/v1/pois/' + item['id']).status_code, 404)
        body['name'] = 'Updated'
        self.assertEqual(self.client.put(path, headers=headers, json=body).json()['name'], 'Updated')
        self.assertIn(item['id'], [p['id'] for p in self.client.get(base, headers=headers).json()['items']])
        for key, value in [('latitude', 91), ('latitude', True), ('longitude', -181), ('radius_m', 19), ('radius_m', 1001), ('category_id', 'missing'), ('name', '  '), ('image_url', 'file:///secret')]:
            with self.subTest(key=key, value=value):
                self.assertEqual(self.client.post(base, headers=headers, json={**body, key:value}).status_code, 422)
        narr = path + '/narrations'
        for locale in ('vi', 'en', 'fr'):
            response = self.client.post(narr, headers=headers, json={'locale':locale, 'title':'Title', 'body':'Text'})
            self.assertEqual(response.status_code, 201, response.text)
        self.assertEqual(self.client.post(narr, headers=headers, json={'locale':'VI', 'title':'Title', 'body':'Text'}).status_code, 409)
        for payload in ({'locale':'xx', 'title':' ', 'body':'Text'}, {'locale':'xx', 'title':'Title', 'body':' '}, {'locale':'!', 'title':'Title', 'body':'Text'}):
            self.assertEqual(self.client.post(narr, headers=headers, json=payload).status_code, 422)
        texts = self.client.get(narr, headers=headers).json()['items']
        self.assertEqual(len(texts), 3)
        updated = self.client.put(narr + '/' + texts[0]['id'], headers=headers, json={'title':'Edited', 'body':'Updated body'})
        self.assertEqual(updated.json()['body'], 'Updated body')
        self.assertEqual(self.client.post(base + '/missing/narrations', headers=headers, json={'locale':'vi','title':'a','body':'b'}).status_code, 404)
        with closing(connect(self.database)) as db, db:
            db.execute("UPDATE pois SET status='hidden' WHERE id=?", (item['id'],))
        self.assertEqual(self.client.get('/api/v1/pois/' + item['id']).status_code, 404)
        self.assertEqual(self.client.delete(path, headers=headers).status_code, 204)
        self.assertEqual(self.client.delete(path, headers=headers).status_code, 404)
        with closing(connect(self.database)) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM poi_narrations WHERE poi_id=?', (item['id'],)).fetchone()[0], 0)

    def test_place_routes_reject_invalid_sessions(self):
        base = '/api/v1/admin/pois'
        for method, path in [('GET',base),('POST',base),('GET',base+'/x'),('PUT',base+'/x'),('DELETE',base+'/x'),('GET',base+'/x/narrations'),('POST',base+'/x/narrations'),('PUT',base+'/x/narrations/y')]:
            for headers in ({}, self.headers('invalid')):
                self.assertEqual(self.client.request(method,path,headers=headers,json={}).status_code, 401)
        token = self.login()
        self.client.post('/api/v1/admin/logout', headers=self.headers(token))
        self.assertEqual(self.client.get(base, headers=self.headers(token)).status_code, 401)
