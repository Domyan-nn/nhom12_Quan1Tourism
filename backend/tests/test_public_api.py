import unicodedata
import unittest
from contextlib import closing

import test_admin_api
from app.db.connection import connect
from scripts.seed_db import stable_id


class PublicAPITests(unittest.TestCase):
    setUp = test_admin_api.AdminAPITests.setUp

    def test_public_response_contract_and_empty_results(self):
        response = self.client.get('/api/v1/categories')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {'items'})
        self.assertTrue(all(set(c) == {'id', 'name', 'name_en'} for c in response.json()['items']))
        self.assertEqual(self.client.get('/api/v1/pois').json(), {'items': []})
        palace = stable_id('poi:dinh-doc-lap')
        with closing(connect(self.database)) as db, db:
            db.execute("UPDATE pois SET status='published' WHERE id=?", (palace,))
        summary = self.client.get('/api/v1/pois').json()['items'][0]
        self.assertEqual(set(summary), {'id', 'name', 'category_id', 'address', 'latitude', 'longitude', 'radius_m', 'image_url', 'image_credit', 'narration_locales'})
        detail = self.client.get('/api/v1/pois/' + palace).json()
        self.assertEqual(set(detail), set(summary) | {'narrations'})
        self.assertEqual(detail['narration_locales'], [n['locale'] for n in detail['narrations']])
        self.assertTrue(all(set(n) == {'locale', 'title', 'body'} for n in detail['narrations']))
        self.assertEqual(self.client.get('/api/v1/pois', params={'category_id': 'missing'}).json(), {'items': []})
        response = self.client.get('/api/v1/pois/missing')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()['error']['code'], 'POI_NOT_FOUND')

    def test_public_visibility_search_and_detail(self):
        palace = stable_id("poi:dinh-doc-lap")
        church = stable_id("poi:nha-tho-duc-ba")
        market = stable_id("poi:cho-ben-thanh")
        history = stable_id("category:history")
        culture = stable_id("category:culture")
        self.assertEqual(self.client.get('/api/v1/pois').json(), {'items': []})
        with closing(connect(self.database)) as db, db:
            db.execute("UPDATE pois SET status='published' WHERE id IN (?, ?)", (palace, market))
            db.execute("UPDATE pois SET status='hidden' WHERE id=?", (church,))
        self.assertEqual(len(self.client.get('/api/v1/categories').json()['items']), 2)
        items = self.client.get('/api/v1/pois').json()['items']
        self.assertEqual({p['id'] for p in items}, {palace, market})
        self.assertEqual(set(next(p for p in items if p['id'] == palace)['narration_locales']), {'vi', 'en'})
        detail = self.client.get('/api/v1/pois/' + palace).json()
        self.assertEqual({n['locale'] for n in detail['narrations']}, {'vi', 'en'})
        for place in (church, stable_id('poi:buu-dien'), 'missing'):
            self.assertEqual(self.client.get('/api/v1/pois/' + place).status_code, 404)
        self.assertEqual([p['id'] for p in self.client.get('/api/v1/pois', params={'q': 'ĐỘC LẬP'}).json()['items']], [palace])
        self.assertEqual([p['id'] for p in self.client.get('/api/v1/pois', params={'category_id': culture}).json()['items']], [market])
        self.assertEqual([p['id'] for p in self.client.get('/api/v1/pois', params={'q': 'dinh', 'category_id': history}).json()['items']], [palace])
        self.assertEqual(self.client.get('/api/v1/pois', params={'q': 'dinh', 'category_id': culture}).json()['items'], [])
        self.assertEqual(self.client.get('/api/v1/pois', params={'q': '%'}).json()['items'], [])
        # Visitors without a Vietnamese keyboard: diacritics and đ are ignored.
        for query in ('cho ben thanh', 'BEN THANH', 'Chợ Bến', unicodedata.normalize('NFD', 'bến thành')):
            self.assertEqual([p['id'] for p in self.client.get('/api/v1/pois', params={'q': query}).json()['items']], [market], query)
        self.assertEqual([p['id'] for p in self.client.get('/api/v1/pois', params={'q': 'dinh doc lap'}).json()['items']], [palace])
        self.assertEqual(self.client.get('/api/v1/pois', params={'q': 'ben thanh x'}).json()['items'], [])
