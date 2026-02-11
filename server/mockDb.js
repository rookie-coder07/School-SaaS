/**
 * Mock In-Memory Database
 * Used as fallback when MongoDB is not available
 */

class MockCollection {
  constructor(name) {
    this.name = name;
    this.data = [];
    this.nextId = 1;
  }

  findOne(query) {
    return Promise.resolve(this.data.find(item => this._matches(item, query)) || null);
  }

  find(query = {}) {
    const results = this.data.filter(item => this._matches(item, query));
    return {
      toArray: () => Promise.resolve(results),
      sort: (sort) => {
        const sorted = [...results].sort((a, b) => {
          for (const [key, order] of Object.entries(sort)) {
            if (a[key] < b[key]) return order === 1 ? -1 : 1;
            if (a[key] > b[key]) return order === 1 ? 1 : -1;
          }
          return 0;
        });
        return {
          toArray: () => Promise.resolve(sorted),
          limit: (n) => ({ toArray: () => Promise.resolve(sorted.slice(0, n)) })
        };
      },
      limit: (n) => {
        const limited = results.slice(0, n);
        return { toArray: () => Promise.resolve(limited) };
      }
    };
  }

  insertOne(doc) {
    const inserted = { _id: this.nextId++, ...doc };
    this.data.push(inserted);
    return Promise.resolve({ insertedId: inserted._id });
  }

  updateOne(query, update) {
    const item = this.data.find(d => this._matches(d, query));
    if (item) {
      Object.assign(item, update.$set || update);
      return Promise.resolve({ modifiedCount: 1 });
    }
    return Promise.resolve({ modifiedCount: 0 });
  }

  deleteOne(query) {
    const idx = this.data.findIndex(d => this._matches(d, query));
    if (idx >= 0) {
      this.data.splice(idx, 1);
      return Promise.resolve({ deletedCount: 1 });
    }
    return Promise.resolve({ deletedCount: 0 });
  }

  aggregate(pipeline) {
    let results = [...this.data];
    for (const stage of pipeline) {
      if (stage.$match) {
        results = results.filter(item => this._matches(item, stage.$match));
      }
      if (stage.$group) {
        // Simple grouping
        const grouped = {};
        results.forEach(item => {
          const key = item[stage.$group._id];
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(item);
        });
        results = Object.entries(grouped).map(([_id, items]) => ({ _id, ...items[0] }));
      }
    }
    return { toArray: () => Promise.resolve(results) };
  }

  _matches(item, query) {
    if (!query || Object.keys(query).length === 0) return true;
    return Object.entries(query).every(([key, value]) => {
      if (typeof value === 'object' && value !== null && typeof value._id !== 'undefined') {
        return item[key]?.toString() === value._id?.toString() || item[key] === value;
      }
      return item[key] == value;
    });
  }
}

class MockDatabase {
  constructor() {
    this.collections = {};
  }

  collection(name) {
    if (!this.collections[name]) {
      this.collections[name] = new MockCollection(name);
    }
    return this.collections[name];
  }
}

export default MockDatabase;
