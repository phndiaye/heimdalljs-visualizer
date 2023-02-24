'use strict';

define('heimdalljs-visualizer/tests/app.lint-test', [], function () {
  'use strict';

  QUnit.module('ESLint | app');

  QUnit.test('app.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'app.js should pass ESLint\n\n');
  });

  QUnit.test('components/basic-tree.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'components/basic-tree.js should pass ESLint\n\n');
  });

  QUnit.test('components/drop-zone.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'components/drop-zone.js should pass ESLint\n\n');
  });

  QUnit.test('components/flame-graph.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'components/flame-graph.js should pass ESLint\n\n');
  });

  QUnit.test('components/slow-node-times.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'components/slow-node-times.js should pass ESLint\n\n');
  });

  QUnit.test('controllers/application.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'controllers/application.js should pass ESLint\n\n');
  });

  QUnit.test('controllers/flame.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'controllers/flame.js should pass ESLint\n\n');
  });

  QUnit.test('controllers/graph.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'controllers/graph.js should pass ESLint\n\n');
  });

  QUnit.test('controllers/graph/index.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'controllers/graph/index.js should pass ESLint\n\n');
  });

  QUnit.test('controllers/graph/node.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'controllers/graph/node.js should pass ESLint\n\n');
  });

  QUnit.test('controllers/selected-node.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'controllers/selected-node.js should pass ESLint\n\n');
  });

  QUnit.test('controllers/slow-nodes.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'controllers/slow-nodes.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/includes.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/includes.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/ns-to-ms.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/ns-to-ms.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/stats-iterator.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/stats-iterator.js should pass ESLint\n\n');
  });

  QUnit.test('resolver.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'resolver.js should pass ESLint\n\n');
  });

  QUnit.test('router.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'router.js should pass ESLint\n\n');
  });

  QUnit.test('services/graph.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'services/graph.js should pass ESLint\n\n');
  });

  QUnit.test('utils/d3-flame-graphs-v4/d3-flame-graph.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'utils/d3-flame-graphs-v4/d3-flame-graph.js should pass ESLint\n\n');
  });
});
define('heimdalljs-visualizer/tests/helpers/destroy-app', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = destroyApp;
  function destroyApp(application) {
    Ember.run(application, 'destroy');
  }
});
define('heimdalljs-visualizer/tests/helpers/module-for-acceptance', ['exports', 'qunit', 'heimdalljs-visualizer/tests/helpers/start-app', 'heimdalljs-visualizer/tests/helpers/destroy-app'], function (exports, _qunit, _startApp, _destroyApp) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  exports.default = function (name, options = {}) {
    (0, _qunit.module)(name, {
      beforeEach() {
        this.application = (0, _startApp.default)();

        if (options.beforeEach) {
          return options.beforeEach.apply(this, arguments);
        }
      },

      afterEach() {
        let afterEach = options.afterEach && options.afterEach.apply(this, arguments);
        return Ember.RSVP.resolve(afterEach).then(() => (0, _destroyApp.default)(this.application));
      }
    });
  };
});
define('heimdalljs-visualizer/tests/helpers/resolver', ['exports', 'heimdalljs-visualizer/resolver', 'heimdalljs-visualizer/config/environment'], function (exports, _resolver, _environment) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });


  const resolver = _resolver.default.create();

  resolver.namespace = {
    modulePrefix: _environment.default.modulePrefix,
    podModulePrefix: _environment.default.podModulePrefix
  };

  exports.default = resolver;
});
define('heimdalljs-visualizer/tests/helpers/start-app', ['exports', 'heimdalljs-visualizer/app', 'heimdalljs-visualizer/config/environment'], function (exports, _app, _environment) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = startApp;
  function startApp(attrs) {
    let attributes = Ember.merge({}, _environment.default.APP);
    attributes = Ember.merge(attributes, attrs); // use defaults, but you can override;

    return Ember.run(() => {
      let application = _app.default.create(attributes);
      application.setupForTesting();
      application.injectTestHelpers();
      return application;
    });
  }
});
define('heimdalljs-visualizer/tests/integration/components/basic-tree-test', ['ember-qunit'], function (_emberQunit) {
  'use strict';

  (0, _emberQunit.moduleForComponent)('basic-tree', 'Integration | Component | basic tree', {
    integration: true
  });

  (0, _emberQunit.test)('it renders', function (assert) {

    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.on('myAction', function(val) { ... });

    this.render(Ember.HTMLBars.template({
      "id": "00R7v1G+",
      "block": "{\"symbols\":[],\"statements\":[[1,[18,\"basic-tree\"],false]],\"hasEval\":false}",
      "meta": {}
    }));

    assert.equal(this._element.textContent.trim(), '');

    // Template block usage:
    this.render(Ember.HTMLBars.template({
      "id": "i4VvR4Vu",
      "block": "{\"symbols\":[],\"statements\":[[0,\"\\n\"],[4,\"basic-tree\",null,null,{\"statements\":[[0,\"      template block text\\n\"]],\"parameters\":[]},null],[0,\"  \"]],\"hasEval\":false}",
      "meta": {}
    }));

    assert.equal(this._element.textContent.trim(), '');
  });
});
define('heimdalljs-visualizer/tests/integration/components/drop-zone-test', ['ember-qunit', '@ember/test-helpers'], function (_emberQunit, _testHelpers) {
  'use strict';

  (0, _emberQunit.moduleForComponent)('drop-zone', 'Integration | Component | drop zone', {
    integration: true
  });

  (0, _emberQunit.test)('it renders', function (assert) {
    this.didDrop = () => {};

    this.render(Ember.HTMLBars.template({
      "id": "LQj1AcXG",
      "block": "{\"symbols\":[],\"statements\":[[0,\"\\n\"],[4,\"drop-zone\",null,null,{\"statements\":[[0,\"      drop-zone\\n\"]],\"parameters\":[]},null],[0,\"  \"]],\"hasEval\":false}",
      "meta": {}
    }));

    assert.ok(this._element.querySelector('.drop-zone') != null);
    assert.equal(this._element.querySelector('.drop-zone').draggable, true);
  });

  (0, _emberQunit.test)('it triggers the dragging state', async function (assert) {
    this.didDrop = () => {};

    this.render(Ember.HTMLBars.template({
      "id": "LQj1AcXG",
      "block": "{\"symbols\":[],\"statements\":[[0,\"\\n\"],[4,\"drop-zone\",null,null,{\"statements\":[[0,\"      drop-zone\\n\"]],\"parameters\":[]},null],[0,\"  \"]],\"hasEval\":false}",
      "meta": {}
    }));

    await (0, _testHelpers.triggerEvent)(this._element.querySelector('.drop-zone'), 'dragenter');
    assert.ok(this._element.querySelector('.drop-zone').classList.contains('drop-zone--dropping'));

    await (0, _testHelpers.triggerEvent)(this._element.querySelector('.drop-zone'), 'dragleave');
    assert.ok(!this._element.querySelector('.drop-zone').classList.contains('drop-zone--dropping'));
  });

  (0, _emberQunit.test)('dropping a file triggers the didDrop action', async function (assert) {
    this.didDrop = event => {
      assert.equal(event.type, 'drop');
    };

    this.render(Ember.HTMLBars.template({
      "id": "P12mjA8A",
      "block": "{\"symbols\":[],\"statements\":[[0,\"\\n\"],[4,\"drop-zone\",null,[[\"didDrop\"],[[19,0,[\"didDrop\"]]]],{\"statements\":[[0,\"      drop-zone\\n\"]],\"parameters\":[]},null],[0,\"  \"]],\"hasEval\":false}",
      "meta": {}
    }));

    await (0, _testHelpers.triggerEvent)(this._element.querySelector('.drop-zone'), 'drop', {
      dataTransfer: {
        files: [new File(['{ "foo": "bar" }'], 'instrumentation.json')]
      }
    });

    assert.expect(1);
  });
});
define('heimdalljs-visualizer/tests/test-helper', ['heimdalljs-visualizer/tests/helpers/resolver', 'ember-qunit', 'ember-cli-qunit'], function (_resolver, _emberQunit, _emberCliQunit) {
  'use strict';

  (0, _emberQunit.setResolver)(_resolver.default);
  (0, _emberCliQunit.start)();
});
define('heimdalljs-visualizer/tests/tests.lint-test', [], function () {
  'use strict';

  QUnit.module('ESLint | tests');

  QUnit.test('helpers/destroy-app.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/destroy-app.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/module-for-acceptance.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/module-for-acceptance.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/resolver.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/resolver.js should pass ESLint\n\n');
  });

  QUnit.test('helpers/start-app.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/start-app.js should pass ESLint\n\n');
  });

  QUnit.test('integration/components/basic-tree-test.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'integration/components/basic-tree-test.js should pass ESLint\n\n');
  });

  QUnit.test('integration/components/drop-zone-test.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'integration/components/drop-zone-test.js should pass ESLint\n\n');
  });

  QUnit.test('test-helper.js', function (assert) {
    assert.expect(1);
    assert.ok(true, 'test-helper.js should pass ESLint\n\n');
  });
});
require('heimdalljs-visualizer/tests/test-helper');
EmberENV.TESTS_FILE_LOADED = true;
//# sourceMappingURL=tests.map
