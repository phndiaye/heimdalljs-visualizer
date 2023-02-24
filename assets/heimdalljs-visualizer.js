"use strict";



define('heimdalljs-visualizer/app', ['exports', 'heimdalljs-visualizer/resolver', 'ember-load-initializers', 'heimdalljs-visualizer/config/environment'], function (exports, _resolver, _emberLoadInitializers, _environment) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });


  const App = Ember.Application.extend({
    modulePrefix: _environment.default.modulePrefix,
    podModulePrefix: _environment.default.podModulePrefix,
    Resolver: _resolver.default
  });

  (0, _emberLoadInitializers.default)(App, _environment.default.modulePrefix);

  exports.default = App;
});
define('heimdalljs-visualizer/components/basic-tree', ['exports', 'd3-selection', 'd3-hierarchy', 'd3-zoom'], function (exports, _d3Selection, _d3Hierarchy, _d3Zoom) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  const run = Ember.run,
        get = Ember.get,
        inject = Ember.inject;


  const DURATION = 500;

  // The offset amount (in px) from the left or right side of a node
  // box to offset lines between nodes, so the lines don't come right
  // up to the edge of the box.
  const NODE_OFFSET_SIZE = 50;

  // copied these functions temporarily from `broccoli-viz` here:
  // https://github.com/ember-cli/broccoli-viz/blob/master/lib/node-by-id.js

  exports.default = Ember.Component.extend({
    classNames: ['basic-tree'],

    graph: inject.service(),

    init() {
      this._super(...arguments);

      this._graphData = null;
    },

    didReceiveAttrs() {
      let graphData = get(this, 'graphData');

      if (this._lastGraphData !== graphData && graphData) {
        run.schedule('render', this, this.drawTree, graphData);

        this._lastGraphData = graphData;
      }
    },

    nodeFilter(node) {
      return node.label.broccoliNode;
    },

    drawTree(graphNode) {
      let svgContainer = this.element.querySelector('.svg-container');
      svgContainer.innerHTML = '';

      let svg = (0, _d3Selection.select)(svgContainer).append("svg").attr("preserveAspectRatio", "xMinYMin meet").attr("viewBox", "0 0 300 300").classed("svg-content", true);

      let g = svg.append("g");

      // Compute the width of a line of text. For now we'll fake it
      // by assuming a constant char width. Add 20 for 'padding'.
      // TODO: convert to the real line size based on the real characters.
      function computeLineWidth(str) {
        const CHAR_WIDTH = 5;
        let val = str.length * CHAR_WIDTH + 20;
        return val;
      }

      // Given a node, compute the width of the box needed to hold
      // the text of the element, by computing the max of the widths
      // of all the text lines.
      function computeNodeWidth(d) {
        return Math.max(computeLineWidth(d.data.label.name), computeLineWidth(`total: ${(d.value / 1000000).toFixed(2)}`), computeLineWidth(`self: ${(d.data._stats.time.self / 1000000).toFixed(2)}`), computeLineWidth(`node id: ${d.data._id}`));
      }

      let root = (0, _d3Hierarchy.hierarchy)(graphNode, node => {
        let children = [];
        for (let child of node.adjacentIterator()) {
          if (this.nodeFilter && !this.nodeFilter(child)) {
            continue;
          }

          children.push(child);
        }

        return children;
      }).sum(d => d._stats.time.self).each(d => d.computedWidth = computeNodeWidth(d));

      // For each node height (distance above leaves, which are height = 0)
      // keep track of the maximum cell width at that height and then use that
      // to compute the desired X position for all the nodes at that height.
      let nodeHeightData = [];

      root.each(d => {
        let heightData = nodeHeightData[d.height];
        if (heightData === undefined) {
          heightData = { maxWidth: d.computedWidth, x: 0 };
          nodeHeightData[d.height] = heightData;
        } else if (heightData.maxWidth < d.computedWidth) {
          heightData.maxWidth = d.computedWidth;
        }
      });

      // Now that we have the maxWidth data for all the heights, compute
      // the X position for all the cells at each height.
      // Each height except the root will have NODE_OFFSET_SIZE on the front.
      // Each height except the leaves (height=0) will have NODE_OFFSET_SIZE after it.
      // We have to iterate through the list in reverse, since height 0
      // has its X value calculated last.
      let currX = 0;

      for (let i = nodeHeightData.length - 1; i >= 0; i--) {
        let item = nodeHeightData[i];
        item.x = currX;
        currX = currX + item.maxWidth + 2 * NODE_OFFSET_SIZE;
      }

      // for debugging
      self.root = root;

      // Create the graph. The nodeSize() is [8,280] (width, height) because we 
      // want to change the orientation of the graph from top-down to left-right.
      // To do that we reverse X and Y for calculations and translations.
      let graph = (0, _d3Hierarchy.cluster)().separation(() => 8).nodeSize([9, 280]);

      function update(source) {
        graph(root);
        let nodes = root.descendants();
        let links = root.links();
        let node = g.selectAll(".node").data(nodes, d => d.data.id);

        // The graph is laid out by graph() as vertically oriented
        // (the root is at the top). We want to show it as horizontally
        // oriented (the root is at the left). In addition, we want
        // each 'row' of nodes to show up as a column with the cells
        // aligned on their left edge at the cell's 0 point.
        // To do all this, we'll flip the d.x and d.y values when translating
        // the node to its position.
        root.each(d => d.y = nodeHeightData[d.height].x);

        // For the 'enter' set, create a node for each entry.
        // Move the node to the computed node point (remembering
        // that X and Y are reversed so we get a horizontal graph).
        let nodeEnter = node.enter().append("g").attr("class", 'node').attr("transform", d => `translate(${d.y},${d.x})`).on('click', d => {
          // Toggle children on click.
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          update(d);
        });

        // Draw the node in a box
        nodeEnter.append("rect").attr('x', 0).attr('y', '-2em').attr('width', function (d) {
          return d.computedWidth;
        }).attr('height', "4em").attr('stroke', "black").attr('stroke-width', 1).style('fill', "#fff");

        // Draw a box in a separate color for the first line as
        // a 'title'. 
        nodeEnter.append("rect").attr('x', 0).attr('y', '-2em').attr('width', function (d) {
          return d.computedWidth;
        }).attr('height', "1em").attr('stroke', "black").attr('stroke-width', 1).style('fill', "#000000");

        nodeEnter.append("text").attr('text-anchor', 'middle').attr("x", d => d.computedWidth / 2).attr("y", '-1.7em').attr("class", "nodetitle").attr("font-weight", "bold").text(function (d) {
          return `${d.data.label.name}`;
        });

        nodeEnter.append("text").attr('text-anchor', 'middle').attr("x", d => d.computedWidth / 2).attr("y", '-0.4em').text(function (d) {
          return `total: ${(d.value / 1000000).toFixed(2)}`;
        });

        nodeEnter.append("text").attr('text-anchor', 'middle').attr("x", d => d.computedWidth / 2).attr("y", '0.8em').text(function (d) {
          return `self: ${(d.data._stats.time.self / 1000000).toFixed(2)}`;
        });

        nodeEnter.append("text").attr('text-anchor', 'middle').attr("x", d => d.computedWidth / 2).attr("y", '2.0em').text(function (d) {
          return `node id: ${d.data._id}`;
        });

        // update exiting node locations
        node.transition().duration(DURATION).attr('transform', d => `translate(${d.y},${d.x})`);

        // Transition exiting nodes to the parent's new position.
        node.exit().transition().duration(DURATION).attr("transform", function () {
          return "translate(" + source.x + "," + source.y + ")";
        }).remove();

        // Create all the links between the various nodes. Each node
        // will have the link from an earlier node (higher height)
        // come into the 0 point for the node, and the links to lower
        // height nodes start at the right edge of the node (+ NODE_OFFSET_SIZE).
        let link = g.selectAll(".link").data(links, d => d.target.data.id);

        link.enter().append("path").attr("class", "link").attr("d", function (d) {
          let sourceExitY = d.source.y + d.source.computedWidth + NODE_OFFSET_SIZE;
          let targetEntranceY = d.target.y - NODE_OFFSET_SIZE;

          return "M" + d.target.y + "," + d.target.x + "L" + targetEntranceY + "," + d.target.x + " " + sourceExitY + "," + d.target.x + " " + sourceExitY + "," + d.source.x + " " + (sourceExitY - NODE_OFFSET_SIZE) + "," + d.source.x;
        });

        link.transition().duration(DURATION).attr("d", function (d) {
          let sourceExitY = d.source.y + d.source.computedWidth + NODE_OFFSET_SIZE;
          let targetEntranceY = d.target.y - NODE_OFFSET_SIZE;

          return "M" + d.target.y + "," + d.target.x + "L" + targetEntranceY + "," + d.target.x + " " + sourceExitY + "," + d.target.x + " " + sourceExitY + "," + d.source.x + " " + (sourceExitY - NODE_OFFSET_SIZE) + "," + d.source.x;
        });

        // update exiting link locations
        link.exit().transition().duration(DURATION / 2).attr("transform", function () {
          return "translate(" + source.x + "," + source.y + ")";
        }).remove();
      }

      update(root);

      let zoomHandler = (0, _d3Zoom.zoom)().on("zoom", () => {
        g.attr("transform", _d3Selection.event.transform);
      });

      function transform() {
        return _d3Zoom.zoomIdentity.translate(48, 120).scale(0.10);
      }

      svg.call(zoomHandler.transform, transform());
      svg.call(zoomHandler);
    }
  });
});
define("heimdalljs-visualizer/components/drop-zone", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.Component.extend({
    classNames: ["drop-zone"],
    classNameBindings: ["dropping:drop-zone--dropping"],
    attributeBindings: ["draggable"],

    dropping: false,
    draggable: true,

    dragOver() {
      return false;
    },

    dragEnter() {
      this.set("dropping", true);
    },

    dragLeave() {
      this.set("dropping", false);
    },

    drop(event) {
      event.preventDefault();
      this.didDrop(event);
    }
  });
});
define('heimdalljs-visualizer/components/flame-graph', ['exports', 'heimdalljs-visualizer/utils/d3-flame-graphs-v4/d3-flame-graph'], function (exports, _d3FlameGraph) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  const run = Ember.run,
        get = Ember.get,
        inject = Ember.inject;
  exports.default = Ember.Component.extend({
    classNames: ['flame-graph'],
    graph: inject.service(),
    flameGraph: null,
    totalTime: Ember.computed.alias('graph.data.summary.totalTime'),

    init() {
      this._super(...arguments);

      this._graphData = null;
    },

    didReceiveAttrs() {
      this._scheduleDraw();
    },

    _scheduleDraw() {
      let graphData = get(this, 'graph.graph');

      if (this._lastGraphData !== graphData && graphData) {
        run.schedule('render', this, this.drawFlame, graphData);

        this._lastGraphData = graphData;
      }
    },

    formatTime(ms) {
      if (ms > 1000000000) {
        return (Math.round(ms / 1000000000 * 100) / 100).toFixed(1) + 's';
      } else if (ms > 1000000) {
        return (Math.round(ms / 1000000 * 100) / 100).toFixed(0) + 'ms';
      } else {
        return (Math.round(ms / 1000000 * 100) / 100).toFixed(1) + 'ms';
      }
    },

    convert(rawData) {
      let node = {
        value: rawData._stats.time.self,
        treeValue: rawData._stats.time.self,
        name: rawData._label.name + (rawData._label.broccoliPluginName ? ' (' + rawData._label.broccoliPluginName + ')' : ''),
        stats: rawData._stats,
        children: []
      };

      if (!rawData._children) {
        return node;
      }

      let treeValue = node.treeValue;
      let _ref = rawData._children;
      for (let _i = 0, _len = _ref.length; _i < _len; _i++) {
        let child = _ref[_i];
        let subTree = this.convert(child);
        if (subTree) {
          node.children.push(subTree);
          treeValue += subTree.treeValue;
        }
      }
      node.treeValue = treeValue;
      node.time = this.formatTime(node.treeValue);
      node.percent = (node.treeValue / this.get('totalTime') * 100).toFixed(1) + "%";
      return node;
    },

    drawFlame(data) {
      let profile = this.convert(data);
      let indent = -1;

      let objToString = obj => {
        indent++;
        let str = '';
        let pad = "&nbsp;";
        for (let p in obj) {
          if (obj.hasOwnProperty(p) && p !== 'own') {
            if (typeof obj[p] === 'object') {
              if (p !== 'time' || p === 'time' && Object.keys(obj[p]).length > 1) {
                let padded = p + pad.repeat(13).substring(0, pad.length * 13 - p.length * 6);
                str += '&nbsp;'.repeat(indent) + padded + (indent <= 0 ? '<br/>' : '') + objToString(obj[p]);
              }
            } else {
              if (p === 'count') {
                let padded = pad.repeat(5).substring(0, pad.length * 5 - obj[p].toString().length * 6) + obj[p];
                str += padded;
              } else if (p === 'time') {
                let time = this.formatTime(obj[p]);
                let padded = ' ' + pad.repeat(8).substring(0, pad.length * 8 - time.length * 6) + time + '<br/>';
                str += padded;
              }
            }
          }
        }
        indent--;
        return str;
      };

      let tooltip = d => {
        let time = this.formatTime(d.data.treeValue);
        let percent = " [" + (d.data.treeValue / this.get('totalTime') * 100).toFixed(1) + "%]";
        let self = " (self: " + this.formatTime(d.data.stats.time.self) + ")";
        return d.data.name + "<br/>" + time + percent + self + "<br/>" + objToString(d.data.stats);
      };

      let clientHeight = document.getElementsByClassName('flame-graph')[0].clientHeight;
      clientHeight -= clientHeight % 20;
      let clientWidth = document.getElementsByClassName('flame-graph')[0].clientWidth;

      this.flameGraph = new _d3FlameGraph.default('#d3-flame-graph', profile, true).size([clientWidth, clientHeight]).cellHeight(20).zoomEnabled(true).zoomAction((node, event) => self.console.log('Zoom: ', node, event)).labelFunction(d => d.data.name + ' [' + d.data.time + ' / ' + d.data.percent + ']').tooltip(tooltip).render();
    }
  });
});
define('heimdalljs-visualizer/components/slow-node-times', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"]) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  }();

  const get = Ember.get,
        set = Ember.set,
        computed = Ember.computed,
        inject = Ember.inject;


  function selfTime(node) {
    for (let _ref of node.statsIterator()) {
      var _ref2 = _slicedToArray(_ref, 2);

      let statName = _ref2[0];
      let value = _ref2[1];

      if (statName === 'time.self') {
        return value;
      }
    }
    return 0;
  }

  // Given a node, compute the total time taken by the node
  // and its children (by summing the total time of the children
  // and adding the self time of the node). Return that value,
  // and assign it to the _stats.time.plugin attribute of the node.
  // Note: we skip the non-broccoliNodes except at the beginning
  // (the root of the tree is not a broccoliNode, but we want to
  // proceed to its children
  function computeNodeTimes(node) {
    var total = selfTime(node);

    for (let childNode of node.adjacentIterator()) {
      if (childNode.label.broccoliNode) {
        total += computeNodeTimes(childNode);
      }
    }

    Ember.set(node._stats.time, 'plugin', total);

    return total;
  }

  exports.default = Ember.Component.extend({
    graph: inject.service(),

    init() {
      this._super(...arguments);
      this.sortDescending = true;
    },

    nodes: computed('data', 'filter', 'pluginNameFilter', 'groupByPluginName', function () {
      let data = this.get('data');

      let nodes = [];

      if (!data) {
        return nodes;
      }

      computeNodeTimes(data); // start at root node of tree (which is not a broccoliNode)

      for (let node of data.dfsIterator()) {
        if (node.label.broccoliNode) {
          nodes.push(node);
        }
      }

      let pluginNameFilter = this.get('pluginNameFilter');
      if (pluginNameFilter) {
        nodes = nodes.filter(node => {
          return node.label.broccoliNode && (pluginNameFilter === node.label.broccoliPluginName || pluginNameFilter === 'undefined' && node.label.broccoliPluginName === undefined);
        });
      }

      // Note: the following is also gathering stats for the items that
      // have no broccoliPluginName (the 'name' is undefined).
      let groupByPluginName = this.get('groupByPluginName');
      if (groupByPluginName) {
        let pluginNameMap = nodes.reduce((memo, node) => {
          let pluginName = node.label.broccoliPluginName;
          memo[pluginName] = memo[pluginName] || { count: 0, time: 0 };
          memo[pluginName].time += node._stats.time.plugin;
          memo[pluginName].count++;
          return memo;
        }, {});

        nodes = [];

        for (let pluginName in pluginNameMap) {
          nodes.push({
            groupedByPluginName: true,
            label: { name: pluginName, broccoliPluginName: pluginNameMap[pluginName].count },
            _stats: {
              time: { plugin: pluginNameMap[pluginName].time }
            }
          });
        }
      }

      return nodes;
    }).readOnly(),

    pluginNames: computed('nodes', function () {
      let nodes = this.get('nodes');

      if (!nodes || nodes.length === 0) {
        return [];
      }

      // If the first item in the list is an object with
      // 'groupedByPluginName' = true, we just need to pull
      // off the label as the plugin name. If not, we need
      // to create a map of the plugin names and return that.
      let pluginNames = [];

      if (nodes[0].groupedByPluginName === true) {
        pluginNames = nodes.map(node => node.label.name);
      } else {
        let pluginNameMap = nodes.reduce((memo, node) => {
          let pluginName = node.label.broccoliPluginName;
          memo[pluginName] = pluginName;
          return memo;
        }, {});

        pluginNames = Object.keys(pluginNameMap);
      }

      pluginNames.sort();

      return pluginNames;
    }).readOnly(),

    sortedNodes: computed('nodes', 'sortDescending', function () {
      let sortDescending = this.get('sortDescending');
      return this.get('nodes').sort((a, b) => {
        if (sortDescending) {
          return b._stats.time.plugin - a._stats.time.plugin;
        } else {
          return a._stats.time.plugin - b._stats.time.plugin;
        }
      });
    }).readOnly(),

    totalTime: computed('nodes', function () {
      let nodes = this.get('nodes');

      return nodes.reduce(function (previousValue, node) {
        return previousValue + node._stats.time.plugin;
      }, 0);
    }).readOnly(),

    actions: {
      'focus-node'(node) {
        this.get('graph').selectNode(node);
      },

      toggleDetailsForNode(node) {
        if (node.groupedByPluginName) {
          this.set('groupByPluginName', false);
          this.set('pluginNameFilter', node.label.name);
        } else {
          let shown = get(node, 'showDetails');
          set(node, 'showDetails', !shown);
        }
      },

      toggleTime() {
        this.toggleProperty('sortDescending');
      },

      selectFilter(value) {
        this.set('pluginNameFilter', value === 'clearFilter' ? undefined : value);
      }
    }
  });
});
define('heimdalljs-visualizer/controllers/application', ['exports', 'fetch'], function (exports, _fetch) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  const inject = Ember.inject;
  exports.default = Ember.Controller.extend({
    graph: inject.service(),

    _setGraphFromFile(file) {
      const reader = new FileReader();

      reader.onload = e => {
        this.get('graph').setGraph(JSON.parse(e.target.result));
        this.set('showUploadModal', false);
      };

      reader.readAsText(file);
    },

    actions: {
      parseFile(event) {
        this._setGraphFromFile(event.target.files[0]);
      },

      onFileDrop(event) {
        this._setGraphFromFile(event.dataTransfer.files[0]);
      },

      useSample(url) {
        (0, _fetch.default)(url).then(response => {
          return response.json();
        }).then(contents => {
          this.get('graph').setGraph(contents);
          this.set('showUploadModal', false);
        });
      },

      clearData() {
        this.get('graph').clearGraph();
      }
    }
  });
});
define('heimdalljs-visualizer/controllers/flame', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  const Controller = Ember.Controller,
        inject = Ember.inject;
  exports.default = Controller.extend({
    graph: inject.service()
  });
});
define('heimdalljs-visualizer/controllers/graph', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  const Controller = Ember.Controller,
        getOwner = Ember.getOwner,
        computed = Ember.computed,
        inject = Ember.inject;
  exports.default = Controller.extend({
    graph: inject.service(),

    route: computed.alias('router.currentPath'),

    init() {
      this._super(...arguments);
      this.set('router', getOwner(this).lookup('router:main'));
    }
  });
});
define('heimdalljs-visualizer/controllers/graph/index', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  const inject = Ember.inject;
  exports.default = Ember.Controller.extend({
    graph: inject.service()
  });
});
define('heimdalljs-visualizer/controllers/graph/node', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  const inject = Ember.inject;
  exports.default = Ember.Controller.extend({
    graph: inject.service()
  });
});
define('heimdalljs-visualizer/controllers/selected-node', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  const inject = Ember.inject;
  exports.default = Ember.Controller.extend({
    graph: inject.service()
  });
});
define('heimdalljs-visualizer/controllers/slow-nodes', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  const inject = Ember.inject;
  exports.default = Ember.Controller.extend({
    graph: inject.service(),

    actions: {
      parseFile(event) {
        let reader = new FileReader();
        reader.onload = e => {
          var contents = e.target.result;
          this.get('graph').setGraph(JSON.parse(contents));
        };

        reader.readAsText(event.target.files[0]);
      }
    }
  });
});
define('heimdalljs-visualizer/event_dispatcher', ['exports', 'ember-native-dom-event-dispatcher'], function (exports, _emberNativeDomEventDispatcher) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _emberNativeDomEventDispatcher.default;
    }
  });
});
define('heimdalljs-visualizer/helpers/and', ['exports', 'ember-truth-helpers/helpers/and'], function (exports, _and) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _and.default;
    }
  });
  Object.defineProperty(exports, 'and', {
    enumerable: true,
    get: function () {
      return _and.and;
    }
  });
});
define('heimdalljs-visualizer/helpers/app-version', ['exports', 'heimdalljs-visualizer/config/environment', 'ember-cli-app-version/utils/regexp'], function (exports, _environment, _regexp) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.appVersion = appVersion;
  const version = _environment.default.APP.version;
  function appVersion(_, hash = {}) {
    if (hash.hideSha) {
      return version.match(_regexp.versionRegExp)[0];
    }

    if (hash.hideVersion) {
      return version.match(_regexp.shaRegExp)[0];
    }

    return version;
  }

  exports.default = Ember.Helper.helper(appVersion);
});
define('heimdalljs-visualizer/helpers/eq', ['exports', 'ember-truth-helpers/helpers/equal'], function (exports, _equal) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _equal.default;
    }
  });
  Object.defineProperty(exports, 'equal', {
    enumerable: true,
    get: function () {
      return _equal.equal;
    }
  });
});
define('heimdalljs-visualizer/helpers/gt', ['exports', 'ember-truth-helpers/helpers/gt'], function (exports, _gt) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _gt.default;
    }
  });
  Object.defineProperty(exports, 'gt', {
    enumerable: true,
    get: function () {
      return _gt.gt;
    }
  });
});
define('heimdalljs-visualizer/helpers/gte', ['exports', 'ember-truth-helpers/helpers/gte'], function (exports, _gte) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _gte.default;
    }
  });
  Object.defineProperty(exports, 'gte', {
    enumerable: true,
    get: function () {
      return _gte.gte;
    }
  });
});
define('heimdalljs-visualizer/helpers/includes', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.Helper.helper(function ([haystack, needle]) {
    return haystack && haystack.includes && haystack.includes(needle);
  });
});
define('heimdalljs-visualizer/helpers/is-array', ['exports', 'ember-truth-helpers/helpers/is-array'], function (exports, _isArray) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _isArray.default;
    }
  });
  Object.defineProperty(exports, 'isArray', {
    enumerable: true,
    get: function () {
      return _isArray.isArray;
    }
  });
});
define('heimdalljs-visualizer/helpers/is-equal', ['exports', 'ember-truth-helpers/helpers/is-equal'], function (exports, _isEqual) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _isEqual.default;
    }
  });
  Object.defineProperty(exports, 'isEqual', {
    enumerable: true,
    get: function () {
      return _isEqual.isEqual;
    }
  });
});
define('heimdalljs-visualizer/helpers/lt', ['exports', 'ember-truth-helpers/helpers/lt'], function (exports, _lt) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _lt.default;
    }
  });
  Object.defineProperty(exports, 'lt', {
    enumerable: true,
    get: function () {
      return _lt.lt;
    }
  });
});
define('heimdalljs-visualizer/helpers/lte', ['exports', 'ember-truth-helpers/helpers/lte'], function (exports, _lte) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _lte.default;
    }
  });
  Object.defineProperty(exports, 'lte', {
    enumerable: true,
    get: function () {
      return _lte.lte;
    }
  });
});
define('heimdalljs-visualizer/helpers/not-eq', ['exports', 'ember-truth-helpers/helpers/not-equal'], function (exports, _notEqual) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _notEqual.default;
    }
  });
  Object.defineProperty(exports, 'notEq', {
    enumerable: true,
    get: function () {
      return _notEqual.notEq;
    }
  });
});
define('heimdalljs-visualizer/helpers/not', ['exports', 'ember-truth-helpers/helpers/not'], function (exports, _not) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _not.default;
    }
  });
  Object.defineProperty(exports, 'not', {
    enumerable: true,
    get: function () {
      return _not.not;
    }
  });
});
define('heimdalljs-visualizer/helpers/ns-to-ms', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.nsToMs = nsToMs;
  function nsToMs([time]) {
    return (time / 1000000).toFixed(2);
  }

  exports.default = Ember.Helper.helper(nsToMs);
});
define('heimdalljs-visualizer/helpers/or', ['exports', 'ember-truth-helpers/helpers/or'], function (exports, _or) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _or.default;
    }
  });
  Object.defineProperty(exports, 'or', {
    enumerable: true,
    get: function () {
      return _or.or;
    }
  });
});
define('heimdalljs-visualizer/helpers/stats-iterator', ['exports'], function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"]) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  }();

  exports.default = Ember.Helper.helper(function ([node]) {
    let stats = {};

    for (let _ref of node.statsIterator()) {
      var _ref2 = _slicedToArray(_ref, 2);

      let name = _ref2[0];
      let value = _ref2[1];

      stats[name] = value;
    }

    return stats;
  });
});
define('heimdalljs-visualizer/helpers/xor', ['exports', 'ember-truth-helpers/helpers/xor'], function (exports, _xor) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () {
      return _xor.default;
    }
  });
  Object.defineProperty(exports, 'xor', {
    enumerable: true,
    get: function () {
      return _xor.xor;
    }
  });
});
define('heimdalljs-visualizer/initializers/app-version', ['exports', 'ember-cli-app-version/initializer-factory', 'heimdalljs-visualizer/config/environment'], function (exports, _initializerFactory, _environment) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });


  let name, version;
  if (_environment.default.APP) {
    name = _environment.default.APP.name;
    version = _environment.default.APP.version;
  }

  exports.default = {
    name: 'App Version',
    initialize: (0, _initializerFactory.default)(name, version)
  };
});
define('heimdalljs-visualizer/initializers/container-debug-adapter', ['exports', 'ember-resolver/resolvers/classic/container-debug-adapter'], function (exports, _containerDebugAdapter) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = {
    name: 'container-debug-adapter',

    initialize() {
      let app = arguments[1] || arguments[0];

      app.register('container-debug-adapter:main', _containerDebugAdapter.default);
      app.inject('container-debug-adapter:main', 'namespace', 'application:main');
    }
  };
});
define('heimdalljs-visualizer/resolver', ['exports', 'ember-resolver'], function (exports, _emberResolver) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = _emberResolver.default;
});
define('heimdalljs-visualizer/router', ['exports', 'heimdalljs-visualizer/config/environment'], function (exports, _environment) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });


  const Router = Ember.Router.extend({
    location: _environment.default.locationType,
    rootURL: _environment.default.rootURL
  });

  Router.map(function () {
    this.route('graph', { path: '/' }, function () {
      this.route('node');
    });

    this.route('slow-nodes');
    this.route('flame');
  });

  exports.default = Router;
});
define('heimdalljs-visualizer/services/graph', ['exports', 'heimdalljs-visualizer/config/environment', 'heimdalljs-graph'], function (exports, _environment, _heimdalljsGraph) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  const getOwner = Ember.getOwner;


  const DATA_STORAGE_KEY = `${_environment.default.storageVersion}_graph-data`;
  const SELECTED_NODE_STORAGE_KEY = `${_environment.default.storageVersion}_selected-node-id`;

  exports.default = Ember.Service.extend({
    init() {
      this._super(...arguments);

      let data = sessionStorage.getItem(DATA_STORAGE_KEY);
      if (data) {
        this.setGraph(JSON.parse(data));
      }

      let selectedNodeId = sessionStorage.getItem(SELECTED_NODE_STORAGE_KEY);
      if (selectedNodeId && data) {
        let graph = this.get('graph');
        for (let node of graph.dfsIterator()) {
          if (node.id === selectedNodeId) {
            this.set('selectedNode', node);
            break;
          }
        }
      }
    },

    setGraph(data) {
      let graph = _heimdalljsGraph.default.loadFromJSON(data);

      try {
        sessionStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        // ignore errors from sessionStorage
      }

      this.set('data', data);
      this.set('graph', graph);
    },

    clearGraph() {
      this.set('data', null);
      this.set('graph', null);

      sessionStorage.removeItem(DATA_STORAGE_KEY);
      sessionStorage.removeItem(SELECTED_NODE_STORAGE_KEY);
    },

    selectNode(node) {
      sessionStorage.setItem(SELECTED_NODE_STORAGE_KEY, node.id);

      this.set('selectedNode', node);
      getOwner(this).lookup('router:main').transitionTo('graph.node');
    }
  });
});
define("heimdalljs-visualizer/templates/application", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.HTMLBars.template({ "id": "oUakfZRD", "block": "{\"symbols\":[],\"statements\":[[6,\"section\"],[9,\"class\",\"global-nav hero is-light\"],[7],[0,\"\\n  \"],[6,\"nav\"],[9,\"class\",\"nav\"],[7],[0,\"\\n    \"],[6,\"div\"],[9,\"class\",\"nav-left\"],[7],[0,\"\\n      \"],[4,\"link-to\",[\"graph\"],[[\"class\",\"activeClass\"],[\"nav-item is-tab\",\"is-active\"]],{\"statements\":[[0,\"Graph\"]],\"parameters\":[]},null],[0,\"\\n      \"],[4,\"link-to\",[\"slow-nodes\"],[[\"class\",\"activeClass\"],[\"nav-item is-tab\",\"is-active\"]],{\"statements\":[[0,\"Nodes\"]],\"parameters\":[]},null],[0,\"\\n      \"],[4,\"link-to\",[\"flame\"],[[\"class\",\"activeClass\"],[\"nav-item is-tab\",\"is-active\"]],{\"statements\":[[0,\"Flame\"]],\"parameters\":[]},null],[0,\"\\n    \"],[8],[0,\"\\n\\n    \"],[6,\"div\"],[9,\"class\",\"nav-center\"],[7],[0,\"\\n      \"],[6,\"p\"],[9,\"class\",\"nav-item title\"],[7],[0,\"\\n        Heimdall Visualizer\\n      \"],[8],[0,\"\\n    \"],[8],[0,\"\\n\\n    \"],[6,\"div\"],[9,\"class\",\"nav-right\"],[7],[0,\"\\n\"],[4,\"if\",[[25,\"not\",[[20,[\"graph\",\"data\"]]],null]],null,{\"statements\":[[0,\"        \"],[6,\"a\"],[9,\"href\",\"#\"],[9,\"class\",\"nav-item\"],[3,\"action\",[[19,0,[]],[25,\"action\",[[19,0,[]],[25,\"mut\",[[20,[\"showUploadModal\"]]],null],true],null]]],[7],[0,\"\\n          Upload Data\\n        \"],[8],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"        \"],[6,\"a\"],[9,\"href\",\"#\"],[9,\"class\",\"nav-item\"],[3,\"action\",[[19,0,[]],\"clearData\"]],[7],[0,\"\\n          Clear Data\\n        \"],[8],[0,\"\\n\"]],\"parameters\":[]}],[0,\"\\n      \"],[6,\"a\"],[9,\"class\",\"nav-item\"],[9,\"href\",\"https://github.com/rwjblue/heimdalljs-visualizer\"],[7],[0,\"\\n        \"],[6,\"span\"],[9,\"class\",\"icon\"],[7],[0,\"\\n          \"],[6,\"i\"],[9,\"class\",\"fa fa-github\"],[7],[8],[0,\"\\n        \"],[8],[0,\"\\n      \"],[8],[0,\"\\n    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n\"],[8],[0,\"\\n\\n\"],[6,\"div\"],[10,\"class\",[26,[\"modal \",[25,\"if\",[[20,[\"showUploadModal\"]],\"is-active\"],null]]]],[7],[0,\"\\n  \"],[6,\"div\"],[9,\"class\",\"modal-background\"],[7],[8],[0,\"\\n  \"],[6,\"div\"],[9,\"class\",\"modal-content\"],[7],[0,\"\\n    \"],[6,\"div\"],[9,\"class\",\"box\"],[7],[0,\"\\n      \"],[6,\"form\"],[7],[0,\"\\n        \"],[6,\"div\"],[9,\"class\",\"control is-grouped\"],[7],[0,\"\\n          \"],[6,\"label\"],[9,\"class\",\"label\"],[7],[0,\"Upload the output of \"],[6,\"code\"],[7],[0,\"BROCCOLI_VIZ=1 ember build\"],[8],[0,\":\"],[8],[0,\"\\n          \"],[6,\"p\"],[9,\"class\",\"control\"],[7],[0,\"\\n            \"],[6,\"input\"],[9,\"name\",\"file-upload\"],[9,\"type\",\"file\"],[10,\"onchange\",[25,\"action\",[[19,0,[]],\"parseFile\"],null],null],[7],[8],[0,\"\\n          \"],[8],[0,\"\\n        \"],[8],[0,\"\\n        \"],[6,\"div\"],[9,\"class\",\"control is-grouped\"],[7],[0,\"\\n          \"],[6,\"label\"],[9,\"class\",\"label\"],[7],[0,\"Sample File:\"],[8],[0,\"\\n          \"],[6,\"p\"],[9,\"class\",\"control\"],[7],[0,\"\\n          \"],[6,\"span\"],[9,\"class\",\"select is-small\"],[7],[0,\"\\n            \"],[6,\"select\"],[10,\"onchange\",[25,\"action\",[[19,0,[]],\"useSample\"],[[\"value\"],[\"target.value\"]]],null],[7],[0,\"\\n              \"],[6,\"option\"],[9,\"selected\",\"\"],[9,\"disabled\",\"\"],[7],[0,\"Choose sample file\"],[8],[0,\"\\n              \"],[6,\"option\"],[9,\"value\",\"./broccoli-viz-files/initial-build-canary-ember-cli-20170206.json\"],[7],[0,\"Empty Project - 2017-02-06\"],[8],[0,\"\\n              \"],[6,\"option\"],[9,\"value\",\"./broccoli-viz-files/ghost-initial-build-canary-ember-cli-20170206.json\"],[7],[0,\"Ghost Admin Client - 2017-02-06\"],[8],[0,\"\\n            \"],[8],[0,\"\\n          \"],[8],[0,\"\\n          \"],[8],[0,\"\\n        \"],[8],[0,\"\\n      \"],[8],[0,\"\\n    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n  \"],[6,\"button\"],[9,\"class\",\"modal-close\"],[3,\"action\",[[19,0,[]],[25,\"action\",[[19,0,[]],[25,\"mut\",[[20,[\"showUploadModal\"]]],null],false],null]]],[7],[8],[0,\"\\n\"],[8],[0,\"\\n\\n\"],[4,\"if\",[[20,[\"graph\",\"data\"]]],null,{\"statements\":[[0,\"  \"],[1,[18,\"outlet\"],false],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"  \"],[6,\"section\"],[9,\"class\",\"upload-data-banner hero is-fullheight is-light\"],[7],[0,\"\\n    \"],[6,\"div\"],[9,\"class\",\"hero-body\"],[7],[0,\"\\n\"],[4,\"drop-zone\",null,[[\"didDrop\"],[[25,\"action\",[[19,0,[]],\"onFileDrop\"],null]]],{\"statements\":[[0,\"        \"],[6,\"div\"],[9,\"class\",\"container has-text-centered\"],[7],[0,\"\\n          \"],[6,\"a\"],[9,\"href\",\"#\"],[3,\"action\",[[19,0,[]],[25,\"action\",[[19,0,[]],[25,\"mut\",[[20,[\"showUploadModal\"]]],null],true],null]]],[7],[0,\"\\n            \"],[6,\"h1\"],[9,\"class\",\"title\"],[7],[0,\"\\n              \"],[6,\"i\"],[9,\"class\",\"fa fa-exclamation-triangle\"],[7],[8],[0,\"\\n            \"],[8],[0,\"\\n            \"],[6,\"h2\"],[9,\"class\",\"subtitle\"],[7],[0,\"\\n              Run \"],[6,\"code\"],[7],[0,\"BROCCOLI_VIZ=1 ember build\"],[8],[0,\" and please upload data to begin your analysis.\\n            \"],[8],[0,\"\\n          \"],[8],[0,\"\\n        \"],[8],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n\"]],\"parameters\":[]}]],\"hasEval\":false}", "meta": { "moduleName": "heimdalljs-visualizer/templates/application.hbs" } });
});
define("heimdalljs-visualizer/templates/components/basic-tree", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.HTMLBars.template({ "id": "XVIYZkvm", "block": "{\"symbols\":[],\"statements\":[[6,\"div\"],[9,\"class\",\"svg-container\"],[7],[0,\"\\n\"],[8]],\"hasEval\":false}", "meta": { "moduleName": "heimdalljs-visualizer/templates/components/basic-tree.hbs" } });
});
define("heimdalljs-visualizer/templates/components/drop-zone", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.HTMLBars.template({ "id": "ABJYRgFE", "block": "{\"symbols\":[\"&default\"],\"statements\":[[6,\"div\"],[9,\"class\",\"content\"],[7],[0,\"\\n  \"],[11,1],[0,\"\\n\"],[8],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "moduleName": "heimdalljs-visualizer/templates/components/drop-zone.hbs" } });
});
define("heimdalljs-visualizer/templates/components/flame-graph", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.HTMLBars.template({ "id": "+D978SC5", "block": "{\"symbols\":[],\"statements\":[[6,\"div\"],[9,\"id\",\"d3-flame-graph\"],[7],[0,\"\\n\"],[8]],\"hasEval\":false}", "meta": { "moduleName": "heimdalljs-visualizer/templates/components/flame-graph.hbs" } });
});
define("heimdalljs-visualizer/templates/components/slow-node-times", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.HTMLBars.template({ "id": "rDb6BWeb", "block": "{\"symbols\":[\"node\",\"stat\",\"value\",\"pluginName\"],\"statements\":[[6,\"div\"],[9,\"class\",\"nodes-controls level is-marginless\"],[7],[0,\"\\n  \"],[6,\"div\"],[9,\"class\",\"level-left\"],[7],[0,\"\\n    \"],[6,\"div\"],[9,\"class\",\"level-item\"],[7],[0,\"\\n      \"],[6,\"p\"],[9,\"class\",\"control has-addons\"],[7],[0,\"\\n        \"],[6,\"select\"],[10,\"onchange\",[25,\"action\",[[19,0,[]],\"selectFilter\"],[[\"value\"],[\"target.value\"]]],null],[7],[0,\"\\n\"],[4,\"unless\",[[20,[\"pluginNameFilter\"]]],null,{\"statements\":[[0,\"             \"],[6,\"option\"],[9,\"disabled\",\"\"],[9,\"selected\",\"\"],[7],[0,\" - Filter by Plugin Name - \"],[8],[0,\"\\n\"]],\"parameters\":[]},null],[4,\"each\",[[20,[\"pluginNames\"]]],null,{\"statements\":[[0,\"             \"],[6,\"option\"],[10,\"value\",[26,[[19,4,[]]]]],[7],[1,[19,4,[]],false],[8],[0,\"\\n\"]],\"parameters\":[4]},null],[4,\"if\",[[20,[\"pluginNameFilter\"]]],null,{\"statements\":[[0,\"             \"],[6,\"option\"],[9,\"value\",\"clearFilter\"],[7],[0,\"Clear Filter\"],[8],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"        \"],[8],[0,\"        \\n      \"],[8],[0,\"\\n    \"],[8],[0,\"\\n\\n    \"],[6,\"div\"],[9,\"class\",\"level-item\"],[7],[0,\"\\n      \"],[6,\"p\"],[9,\"class\",\"control\"],[7],[0,\"\\n        \"],[6,\"label\"],[9,\"class\",\"checkbox\"],[7],[0,\"\\n          \"],[6,\"input\"],[9,\"type\",\"checkbox\"],[10,\"checked\",[18,\"groupByPluginName\"],null],[10,\"onchange\",[25,\"action\",[[19,0,[]],[25,\"mut\",[[20,[\"groupByPluginName\"]]],null]],[[\"value\"],[\"target.checked\"]]],null],[7],[8],[0,\"\\n          Group by Plugin Name\\n        \"],[8],[0,\"\\n      \"],[8],[0,\"\\n    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n\"],[8],[0,\"\\n\\n\"],[6,\"table\"],[9,\"class\",\"nodes-table table is-striped\"],[7],[0,\"\\n  \"],[6,\"thead\"],[9,\"class\",\"nodes-table_header\"],[7],[0,\"\\n    \"],[6,\"tr\"],[7],[0,\"\\n      \"],[6,\"th\"],[7],[0,\"Description\"],[8],[0,\"\\n      \"],[6,\"th\"],[7],[1,[25,\"if\",[[20,[\"groupByPluginName\"]],\"Count\",\"Plugin Name\"],null],false],[8],[0,\"\\n      \"],[6,\"th\"],[9,\"class\",\"td-time\"],[7],[0,\"\\n        \"],[6,\"a\"],[9,\"href\",\"#\"],[9,\"class\",\"nodes-table_toggle\"],[3,\"action\",[[19,0,[]],\"toggleTime\"]],[7],[0,\"Time (ms) \"],[6,\"i\"],[10,\"class\",[26,[\"fa fa-caret-\",[25,\"if\",[[20,[\"sortDescending\"]],\"down\",\"up\"],null]]]],[7],[8],[8],[0,\"\\n      \"],[8],[0,\"\\n    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n\\n  \"],[6,\"tbody\"],[7],[0,\"\\n\"],[4,\"each\",[[20,[\"sortedNodes\"]]],null,{\"statements\":[[0,\"      \"],[6,\"tr\"],[9,\"class\",\"table-row\"],[3,\"action\",[[19,0,[]],\"toggleDetailsForNode\",[19,1,[]]]],[7],[0,\"\\n        \"],[6,\"td\"],[7],[1,[19,1,[\"label\",\"name\"]],false],[8],[0,\"\\n        \"],[6,\"td\"],[9,\"class\",\"table-row-plugin-name\"],[7],[1,[19,1,[\"label\",\"broccoliPluginName\"]],false],[8],[0,\"\\n        \"],[6,\"td\"],[9,\"class\",\"td-time\"],[7],[1,[25,\"ns-to-ms\",[[19,1,[\"_stats\",\"time\",\"plugin\"]]],null],false],[8],[0,\"\\n      \"],[8],[0,\"\\n\"],[4,\"if\",[[19,1,[\"showDetails\"]]],null,{\"statements\":[[0,\"        \"],[6,\"tr\"],[7],[0,\"\\n          \"],[6,\"td\"],[9,\"colspan\",\"3\"],[7],[0,\"\\n            \"],[6,\"div\"],[9,\"class\",\"card\"],[7],[0,\"\\n              \"],[6,\"header\"],[9,\"class\",\"card-header\"],[7],[0,\"\\n                \"],[6,\"p\"],[9,\"class\",\"card-header-title\"],[7],[0,\"\\n                  Node Stats\\n                \"],[8],[0,\"\\n              \"],[8],[0,\"\\n\\n              \"],[6,\"div\"],[9,\"class\",\"card-content\"],[7],[0,\"\\n\"],[4,\"each\",[[25,\"-each-in\",[[25,\"stats-iterator\",[[19,1,[]]],null]],null]],null,{\"statements\":[[0,\"                  \"],[6,\"div\"],[7],[0,\"\\n                    \"],[6,\"strong\"],[7],[1,[19,2,[]],false],[8],[0,\":\\n\"],[4,\"if\",[[25,\"includes\",[[19,2,[]],\"time\"],null]],null,{\"statements\":[[0,\"                      \"],[1,[25,\"ns-to-ms\",[[19,3,[]]],null],false],[0,\"ms\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"                      \"],[1,[19,3,[]],false],[0,\"\\n\"]],\"parameters\":[]}],[0,\"                  \"],[8],[0,\"\\n\"]],\"parameters\":[2,3]},null],[0,\"              \"],[8],[0,\"\\n\\n              \"],[6,\"div\"],[9,\"class\",\"card-footer\"],[7],[0,\"\\n                \"],[6,\"a\"],[9,\"class\",\"card-footer-item\"],[3,\"action\",[[19,0,[]],\"focus-node\",[19,1,[]]]],[7],[0,\"Show Graph\"],[8],[0,\"\\n              \"],[8],[0,\"\\n            \"],[8],[0,\"\\n          \"],[8],[0,\"\\n        \"],[8],[0,\"\\n\"]],\"parameters\":[]},null]],\"parameters\":[1]},null],[0,\"  \"],[8],[0,\"\\n  \"],[6,\"tfoot\"],[7],[0,\"\\n    \"],[6,\"tr\"],[7],[0,\"\\n      \"],[6,\"td\"],[9,\"colspan\",\"3\"],[9,\"class\",\"td-time\"],[7],[0,\"Total: \"],[1,[25,\"ns-to-ms\",[[20,[\"totalTime\"]]],null],false],[8],[0,\"\\n    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n\"],[8]],\"hasEval\":false}", "meta": { "moduleName": "heimdalljs-visualizer/templates/components/slow-node-times.hbs" } });
});
define("heimdalljs-visualizer/templates/flame", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.HTMLBars.template({ "id": "3lm5ZMs/", "block": "{\"symbols\":[],\"statements\":[[1,[25,\"flame-graph\",null,[[\"graphData\"],[[20,[\"graph\",\"graph\"]]]]],false],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "moduleName": "heimdalljs-visualizer/templates/flame.hbs" } });
});
define("heimdalljs-visualizer/templates/graph", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.HTMLBars.template({ "id": "3RTwBQNM", "block": "{\"symbols\":[],\"statements\":[[1,[18,\"outlet\"],false],[0,\"\\n\\n\"],[6,\"div\"],[9,\"class\",\"selected-node-controls hero-footer\"],[7],[0,\"\\n  \"],[6,\"nav\"],[9,\"class\",\"tabs is-boxed is-fullwidth\"],[7],[0,\"\\n    \"],[6,\"div\"],[9,\"class\",\"container\"],[7],[0,\"\\n      \"],[6,\"ul\"],[7],[0,\"\\n        \"],[6,\"li\"],[10,\"class\",[26,[[25,\"if\",[[25,\"eq\",[[20,[\"route\"]],\"graph.index\"],null],\"is-active\"],null]]]],[7],[0,\"\\n          \"],[4,\"link-to\",[\"graph.index\"],null,{\"statements\":[[0,\"Full Graph\"]],\"parameters\":[]},null],[0,\"\\n        \"],[8],[0,\"\\n        \"],[6,\"li\"],[10,\"class\",[26,[[25,\"if\",[[25,\"eq\",[[20,[\"route\"]],\"graph.node\"],null],\"is-active\"],null]]]],[7],[0,\"\\n\"],[4,\"link-to\",[\"graph.node\"],null,{\"statements\":[[0,\"            Selected Node: \"],[1,[25,\"if\",[[20,[\"graph\",\"selectedNode\"]],[20,[\"graph\",\"selectedNode\",\"label\",\"name\"]],\"None\"],null],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"        \"],[8],[0,\"\\n      \"],[8],[0,\"\\n    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n\"],[8],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "moduleName": "heimdalljs-visualizer/templates/graph.hbs" } });
});
define("heimdalljs-visualizer/templates/graph/index", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.HTMLBars.template({ "id": "1UnCPxXs", "block": "{\"symbols\":[],\"statements\":[[1,[25,\"basic-tree\",null,[[\"graphData\"],[[20,[\"graph\",\"graph\"]]]]],false],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "moduleName": "heimdalljs-visualizer/templates/graph/index.hbs" } });
});
define("heimdalljs-visualizer/templates/graph/node", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.HTMLBars.template({ "id": "cgjGOSyG", "block": "{\"symbols\":[],\"statements\":[[4,\"if\",[[20,[\"graph\",\"selectedNode\"]]],null,{\"statements\":[[0,\"  \"],[1,[25,\"basic-tree\",null,[[\"graphData\",\"nodeFilter\"],[[20,[\"graph\",\"selectedNode\"]],null]]],false],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"  \"],[6,\"section\"],[9,\"class\",\"upload-data-banner hero is-fullheight is-light\"],[7],[0,\"\\n    \"],[6,\"div\"],[9,\"class\",\"hero-body\"],[7],[0,\"\\n      \"],[6,\"div\"],[9,\"class\",\"container has-text-centered\"],[7],[0,\"\\n\"],[4,\"link-to\",[\"slow-nodes\"],null,{\"statements\":[[0,\"          \"],[6,\"h1\"],[9,\"class\",\"title\"],[7],[0,\"\\n            \"],[6,\"i\"],[9,\"class\",\"fa fa-exclamation-triangle\"],[7],[8],[0,\"\\n          \"],[8],[0,\"\\n          \"],[6,\"h2\"],[9,\"class\",\"subtitle\"],[7],[0,\"\\n            Please select a node from the Nodes page.\\n          \"],[8],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"      \"],[8],[0,\"\\n    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n\"]],\"parameters\":[]}]],\"hasEval\":false}", "meta": { "moduleName": "heimdalljs-visualizer/templates/graph/node.hbs" } });
});
define("heimdalljs-visualizer/templates/slow-nodes", ["exports"], function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.HTMLBars.template({ "id": "RVmF1XuO", "block": "{\"symbols\":[],\"statements\":[[1,[25,\"slow-node-times\",null,[[\"data\"],[[20,[\"graph\",\"graph\"]]]]],false],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "moduleName": "heimdalljs-visualizer/templates/slow-nodes.hbs" } });
});
define('heimdalljs-visualizer/utils/d3-flame-graphs-v4/d3-flame-graph', ['exports', 'd3-selection', 'd3-scale', 'd3-array', 'd3-tip', 'd3-hierarchy', 'd3-transition'], function (exports, _d3Selection, _d3Scale, _d3Array, _d3Tip, _d3Hierarchy) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });


  function getClassAndMethodName(fqdn) {
    if (!fqdn) {
      return "";
    }
    let tokens = fqdn.split(".");
    return tokens.slice(tokens.length - 2).join(".");
  }

  // Return a vector (0.0 -> 1.0) that is a hash of the input string.
  // The hash is computed to favor early characters over later ones, so
  // that strings with similar starts have similar vectors. Only the first
  // 6 characters are considered.
  function hash(name) {
    let ref = [0, 0, 1, 10];
    let result = ref[0];
    let maxHash = ref[1];
    let weight = ref[2];
    let mod = ref[3];

    name = getClassAndMethodName(name).slice(0, 6);

    for (let i = 0, j = 0, ref1 = name.length - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; i = 0 <= ref1 ? ++j : --j) {
      result += weight * (name.charCodeAt(i) % mod);
      maxHash += weight * (mod - 1);
      weight *= 0.7;
    }
    if (maxHash > 0) {
      return result / maxHash;
    } else {
      return result;
    }
  }

  const FlameGraphUtils = {
    // augments each node in the tree with the maximum distance
    // it is from a terminal node, the list of parents linking
    // it to the root and filler nodes that balance the representation
    augment(node, location) {
      let children = node.children;
      // d3.partition adds the reverse (depth), here we store the distance
      // between a node and its furthest leaf
      if (node.augmented) {
        return node;
      }
      node.originalValue = node.value;
      node.level = node.children ? 1 : 0;
      node.hidden = [];
      node.location = location;
      if (!(children != null ? children.length : void 0)) {
        node.augmented = true;
        return node;
      }
      let childSum = children.reduce((sum, child) => sum + child.value, 0);
      if (childSum < node.value) {
        children.push({
          value: node.value - childSum,
          filler: true
        });
      }
      children.forEach((child, idx) => FlameGraphUtils.augment(child, location + "." + idx));
      node.level += children.reduce((max, child) => Math.max(child.level, max), 0);
      node.augmented = true;
      return node;
    },

    partition(data) {
      let d3partition = (0, _d3Hierarchy.partition)();

      let root = (0, _d3Hierarchy.hierarchy)(data).sum(d => d.data ? d.data.value : d.value).sort((a, b) => {
        if (a.filler) {
          return 1; // move fillers to the right
        }
        if (b.filler) {
          return -1; // move fillers to the right
        }
        const name = a.data.name || "";
        return name.localeCompare(b.data.name);
      });
      return d3partition(root).descendants();
    },

    hide(nodes, unhide) {
      if (unhide === null) {
        unhide = false;
      }
      let sum = arr => arr.reduce((acc, val) => acc + val, 0);
      let remove = (arr, val) => {
        // we need to remove precisely one occurrence of initial value
        let pos = arr.indexOf(val);
        if (pos >= 0) {
          return arr.splice(pos, 1);
        }
      };
      let process = (node, val) => {
        if (unhide) {
          remove(node.hidden, val);
        } else {
          node.hidden.push(val);
        }
        return node.value = Math.max(node.originalValue - sum(node.hidden), 0);
      };
      let processChildren = (node, val) => {
        if (!node.children) {
          return;
        }
        return node.children.forEach(child => {
          process(child, val);
          return processChildren(child, val);
        });
      };
      let processParents = (node, val) => {
        let results = [];
        while (node.parent) {
          process(node.parent, val);
          results.push(node = node.parent);
        }
        return results;
      };
      return nodes.forEach(node => {
        let val = node.originalValue;
        processParents(node, val);
        process(node, val);
        return processChildren(node, val);
      });
    }
  };

  class FlameGraph {
    constructor(selector, root, debug) {
      this._selector = selector;
      this._generateAccessors(['margin', 'cellHeight', 'zoomEnabled', 'zoomAction', 'tooltip', 'tooltipPlugin', 'color', 'labelFunction']);
      this._ancestors = [];
      if (debug == null) {
        debug = false;
      }

      // enable logging only if explicitly specified
      if (debug) {
        this.console = window.console;
      } else {
        this.console = {
          log() {},
          time() {},
          timeEnd() {}
        };
      }

      // defaults
      this._size = [1200, 800];
      this._cellHeight = 20;
      this._margin = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      };
      this._color = d => {
        let val = hash(d.data ? d.data.name : d.name);
        let r = 200 + Math.round(55 * val);
        let g = 0 + Math.round(230 * (1 - val));
        let b = 0 + Math.round(55 * (1 - val));
        return "rgb(" + r + ", " + g + ", " + b + ")";
      };
      this._labelFunction = null;
      this._tooltipEnabled = true;
      this._zoomEnabled = true;
      if (this._tooltipEnabled && _d3Tip.default) {
        this._tooltipPlugin = (0, _d3Tip.default)();
      }

      // initial processing of data
      this.console.time('augment');
      this.original = FlameGraphUtils.augment(root, '0');
      this.console.timeEnd('augment');
      this.root(this.original);
    }

    size(size) {
      if (size) {
        this._size = size;
        (0, _d3Selection.select)(this._selector).select('.flame-graph').attr('width', this._size[0]).attr('height', this._size[1]);
        return this;
      }
      return this._size;
    }

    root(root) {
      if (!root) {
        return this._root;
      }
      this.console.time('partition');
      this._root = root;
      this._data = FlameGraphUtils.partition(this._root);
      this._rootNode = this._data[0];
      this.console.timeEnd('partition');
      return this;
    }

    hide(predicate, unhide) {
      let matches;
      if (unhide == null) {
        unhide = false;
      }
      matches = this.select(predicate, false);
      if (!matches.length) {
        return;
      }
      FlameGraphUtils.hide(matches, unhide);
      this._data = FlameGraphUtils.partition(this._root);
      return this.render();
    }

    zoom(node, event) {
      if (!this.zoomEnabled()) {
        throw new Error("Zoom is disabled!");
      }
      if (this.tip) {
        this.tip.hide();
      }
      if (this._ancestors.indexOf(node) >= 0) {
        this._ancestors = this._ancestors.slice(0, this._ancestors.indexOf(node));
      } else {
        this._ancestors.push(this._root);
      }
      this.root(node.data ? node.data : node).render();
      if (typeof this._zoomAction === "function") {
        this._zoomAction(node, event);
      }
      return this;
    }

    width() {
      return this.size()[0] - (this.margin().left + this.margin().right);
    }

    height() {
      return this.size()[1] - (this.margin().top + this.margin().bottom);
    }

    label(d) {
      if (!(d != null ? d.data.name : void 0)) {
        return "";
      }
      let label = typeof this._labelFunction === "function" ? this._labelFunction(d) : getClassAndMethodName(d.data.name);

      return label.substr(0, Math.round(this.x(d.x1 - d.x0) / (this.cellHeight() / 10 * 4)));
    }

    select(predicate, onlyVisible) {
      let result;
      if (onlyVisible == null) {
        onlyVisible = true;
      }
      if (onlyVisible) {
        return this.container.selectAll('.node').filter(predicate);
      } else {
        // re-partition the data prior to rendering
        result = FlameGraphUtils.partition(this.original).filter(predicate);
        return result;
      }
    }

    render() {
      if (!this._selector) {
        throw new Error("No DOM element provided");
      }
      this.console.time('render');
      if (!this.container) {
        this._createContainer();
      }

      // reset size and scales
      this.fontSize = this.cellHeight() / 10 * 0.4;

      this.x = (0, _d3Scale.scaleLinear)().domain([0, (0, _d3Array.max)(this._data, d => d.x1)]).range([0, this.width()]);

      let visibleCells = Math.floor(this.height() / this.cellHeight());
      let maxLevels = this._root.level;

      this.y = (0, _d3Scale.scaleQuantize)().domain([(0, _d3Array.min)(this._data, d => d.y0), (0, _d3Array.max)(this._data, d => d.y0)]).range((0, _d3Array.range)(maxLevels).map(function (_this) {
        return function (cell) {
          return (visibleCells - 1 - cell - _this._ancestors.length) * _this.cellHeight();
        };
      }(this)));

      // JOIN
      let data = this._data.filter(function (_this) {
        return function (d) {
          return _this.x(d.x1 - d.x0) > 0.4 && _this.y(d.y0) >= 0 && !d.data.filler;
        };
      }(this));
      let renderNode = {
        x: function (_this) {
          return function (d) {
            return _this.x(d.x0);
          };
        }(this),
        y: function (_this) {
          return function (d) {
            return _this.y(d.y0);
          };
        }(this),
        width: function (_this) {
          return function (d) {
            let res = _this.x(d.x1 - d.x0);
            return res;
          };
        }(this),
        height: function (_this) {
          return function () /* d */{
            return _this.cellHeight();
          };
        }(this),
        text: function (_this) {
          return function (d) {
            if (d.data.name && _this.x(d.x1 - d.x0) > 40) {
              return _this.label(d);
            }
          };
        }(this)
      };
      let existingContainers = this.container.selectAll('.node').data(data, d => d.data.location).attr('class', 'node');

      // UPDATE
      this._renderNodes(existingContainers, renderNode, false, data);

      // ENTER
      let newContainers = existingContainers.enter().append('g').attr('class', 'node');
      this._renderNodes(newContainers, renderNode, true, data);

      // EXIT
      existingContainers.exit().remove();
      if (this.zoomEnabled()) {
        this._renderAncestors()._enableNavigation();
      }
      if (this.tooltip()) {
        this._renderTooltip();
      }
      this.console.timeEnd('render');
      this.console.log(`Processed ${this._data.length} items`);
      return this;
    }

    _createContainer() {
      // remove any previously existing svg
      (0, _d3Selection.select)(this._selector).select('svg').remove();
      // create main svg container
      let svg = (0, _d3Selection.select)(this._selector).append('svg').attr('class', 'flame-graph').attr('width', this._size[0]).attr('height', this._size[1]);
      // we set an offset based on the margin
      let offset = `translate(${this.margin().left}, ${this.margin().top})`;
      // this.container will hold all our nodes
      this.container = svg.append('g').attr('transform', offset);

      // this rectangle draws the border around the flame graph
      // has to be appended after the container so that the border is visible
      // we also need to apply the same translation
      return svg.append('rect').attr('width', this._size[0] - (this._margin.left + this._margin.right)).attr('height', this._size[1] - (this._margin.top + this._margin.bottom)).attr('transform', offset).attr('class', 'border-rect');
    }

    _renderNodes(containers, attrs, enter, data) {
      let targetLabels;
      let targetRects;
      if (enter == null) {
        enter = false;
      }
      if (!enter) {
        targetRects = containers.selectAll('rect');
      }
      if (enter) {
        targetRects = containers.append('rect');
      }

      targetRects.data(data, d => d.data ? d.data.location : d.location).attr('fill', function (_this) {
        return function (d) {
          return _this._color(d);
        };
      }(this)).transition().attr('width', attrs.width).attr('height', this.cellHeight()).attr('x', attrs.x).attr('y', attrs.y);

      if (!enter) {
        targetLabels = containers.selectAll('text');
      }
      if (enter) {
        targetLabels = containers.append('text');
      }
      targetLabels.data(data, d => d.data ? d.data.location : d.location).attr('class', 'label').style('font-size', this.fontSize + "em").transition().attr('dy', this.fontSize / 2 + "em").attr('x', function () {
        return function (d) {
          return attrs.x(d) + 2;
        };
      }(this)).attr('y', function (_this) {
        return function (d, idx) {
          return attrs.y(d, idx) + _this.cellHeight() / 2;
        };
      }(this)).text(attrs.text);
      return this;
    }

    _renderTooltip() {
      if (!this._tooltipPlugin || !this._tooltipEnabled) {
        return this;
      }
      this.tip = this._tooltipPlugin.attr('class', 'd3-tip').html(this.tooltip()).direction((_this => d => {
        if (_this.x(d.x0) + _this.x(d.x1 - d.x0) / 2 > _this.width() - 100) {
          return 'w';
        }
        if (_this.x(d.x0) + _this.x(d.x1 - d.x0) / 2 < 100) {
          return 'e';
        }
        return 's';
      })(this)).offset((_this => d => {
        let x = _this.x(d.x0) + _this.x(d.x1 - d.x0) / 2;
        let xOffset = Math.max(Math.ceil(_this.x(d.x1 - d.x0) / 2), 5);
        let yOffset = Math.ceil(_this.cellHeight() / 2);
        if (_this.width() - 100 < x) {
          return [0, -xOffset];
        }
        if (x < 100) {
          return [0, xOffset];
        }
        return [yOffset, 0];
      })(this));
      this.container.call(this.tip);
      this.container.selectAll('.node').on('mouseover', function (_this) {
        return function (d) {
          return _this.tip.show(d, _d3Selection.event.currentTarget);
        };
      }(this)).on('mouseout', this.tip.hide).selectAll('.label').on('mouseover', function (_this) {
        return function (d) {
          return _this.tip.show(d, _d3Selection.event.currentTarget.parentNode);
        };
      }(this)).on('mouseout', this.tip.hide);
      return this;
    }

    _renderAncestors() {
      let j;
      let idx;
      let len;
      let ancestor;
      let ancestors;
      if (!this._ancestors.length) {
        ancestors = this.container.selectAll('.ancestor').remove();
        return this;
      }
      let ancestorData = this._ancestors.map((ancestor, idx) => ({
        name: ancestor.name,
        value: idx + 1,
        location: ancestor.location,
        isAncestor: true
      }));
      for (idx = j = 0, len = ancestorData.length; j < len; idx = ++j) {
        ancestor = ancestorData[idx];
        let prev = ancestorData[idx - 1];
        if (prev) {
          prev.children = [ancestor];
        }
      }

      // FIXME: this is pretty ugly, but we need to add links between ancestors
      let renderAncestor = {
        x: function () {
          return function () /* d */{
            return 0;
          };
        }(this),
        y: function (_this) {
          return function (d) {
            return _this.height() - d.value * _this.cellHeight();
          };
        }(this),
        width: this.width(),
        height: this.cellHeight(),
        text: function () {
          return function (d) {
            return "↩ " + getClassAndMethodName(d.data ? d.data.name : d.name);
          };
        }(this)
      };

      // JOIN
      ancestors = this.container.selectAll('.ancestor').data(FlameGraphUtils.partition(ancestorData[0]), d => d.location);

      // UPDATE
      this._renderNodes(ancestors, renderAncestor, false, ancestorData);
      // ENTER
      let newAncestors = ancestors.enter().append('g').attr('class', 'ancestor');
      this._renderNodes(newAncestors, renderAncestor, true, ancestorData);
      // EXIT
      ancestors.exit().remove();
      return this;
    }

    _enableNavigation() {
      let clickable = (_this => d => {
        let ref;
        return Math.round(_this.width() - _this.x(d.x1 - d.x0)) > 0 && ((ref = d.children) != null ? ref.length : void 0);
      })(this);

      this.container.selectAll('.node').classed('clickable', (() => d => clickable(d))(this)).on('click', (_this => d => {
        if (_this.tip) {
          _this.tip.hide();
        }
        if (clickable(d)) {
          return _this.zoom(d, _d3Selection.event);
        }
      })(this));
      this.container.selectAll('.ancestor').on('click', (_this => (d, idx) => {
        if (_this.tip) {
          _this.tip.hide();
        }
        return _this.zoom(_this._ancestors[idx], _d3Selection.event);
      })(this));
      return this;
    }

    _generateAccessors(accessors) {
      let accessor;
      let results = [];
      for (let j = 0, len = accessors.length; j < len; j++) {
        accessor = accessors[j];
        results.push(this[accessor] = (accessor => function (newValue) {
          if (!arguments.length) {
            return this["_" + accessor];
          }
          this["_" + accessor] = newValue;
          return this;
        })(accessor));
      }
      return results;
    }
  }
  exports.default = FlameGraph;
});


define('heimdalljs-visualizer/config/environment', [], function() {
  var prefix = 'heimdalljs-visualizer';
try {
  var metaName = prefix + '/config/environment';
  var rawConfig = document.querySelector('meta[name="' + metaName + '"]').getAttribute('content');
  var config = JSON.parse(unescape(rawConfig));

  var exports = { 'default': config };

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;
}
catch(err) {
  throw new Error('Could not read config from meta tag with name "' + metaName + '".');
}

});

if (!runningTests) {
  require("heimdalljs-visualizer/app")["default"].create({"name":"heimdalljs-visualizer","version":"0.5.0+82fc9771"});
}
//# sourceMappingURL=heimdalljs-visualizer.map
