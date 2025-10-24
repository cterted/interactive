(function () {
  'use strict';

  const LOCAL_STORAGE_KEY = 'goalDecompositionGraph.v1';

  /** @type {{ nodes: Array<any>, edges: Array<any>, meta: { nextNodeId: number, nextEdgeId: number } }} */
  let graphState = {
    nodes: [],
    edges: [],
    meta: { nextNodeId: 1, nextEdgeId: 1 },
  };

  const appState = {
    mode: 'graph', // 'graph' | 'tree'
    interactionMode: 'select', // 'select' | 'connect'
    selectedNodeId: null,
    selectedEdgeId: null,
    pendingSourceNodeId: null,
    treeRootId: null,
  };

  const categoryToColor = {
    '目标': '#1976d2',
    '子目标': '#388e3c',
    '任务': '#8e24aa',
    '页面': '#f57c00',
    '其他': '#546e7a',
  };

  const chartEl = document.getElementById('chart');
  const chart = echarts.init(chartEl);

  // UI elements
  const statusText = document.getElementById('statusText');
  const btnAddNode = document.getElementById('btnAddNode');
  const btnDeleteSelected = document.getElementById('btnDeleteSelected');
  const btnConnectMode = document.getElementById('btnConnectMode');
  const btnSave = document.getElementById('btnSave');
  const btnLoad = document.getElementById('btnLoad');
  const btnExport = document.getElementById('btnExport');
  const fileImport = document.getElementById('fileImport');
  const btnTreeView = document.getElementById('btnTreeView');
  const btnBackToGraph = document.getElementById('btnBackToGraph');

  // Side panel elements
  const selectionEmpty = document.getElementById('selectionEmpty');
  const nodeEditor = document.getElementById('nodeEditor');
  const nodeIdSpan = document.getElementById('nodeId');
  const nodeNameInput = document.getElementById('nodeName');
  const nodeCategorySelect = document.getElementById('nodeCategory');
  const nodeXInput = document.getElementById('nodeX');
  const nodeYInput = document.getElementById('nodeY');
  const btnUpdateNode = document.getElementById('btnUpdateNode');
  const btnSetTreeRoot = document.getElementById('btnSetTreeRoot');

  const edgeEditor = document.getElementById('edgeEditor');
  const edgeIdSpan = document.getElementById('edgeId');
  const edgeEndsSpan = document.getElementById('edgeEnds');
  const edgeLabelInput = document.getElementById('edgeLabel');
  const btnUpdateEdge = document.getElementById('btnUpdateEdge');

  function updateStatus() {
    const modeCn = appState.mode === 'graph' ? '图编辑' : '树展示';
    const interCn = appState.interactionMode === 'connect' ? '（连接模式）' : '';
    const pendingCn = appState.pendingSourceNodeId ? ` - 已选源节点 ${appState.pendingSourceNodeId}` : '';
    statusText.textContent = `模式：${modeCn}${interCn}${pendingCn}`;
    btnConnectMode.classList.toggle('active', appState.interactionMode === 'connect');
  }

  function getNodeById(id) {
    return graphState.nodes.find((n) => String(n.id) === String(id)) || null;
  }
  function getEdgeById(id) {
    return graphState.edges.find((e) => String(e.id) === String(id)) || null;
  }

  function deselectAll() {
    appState.selectedNodeId = null;
    appState.selectedEdgeId = null;
    appState.pendingSourceNodeId = null;
    refreshEditors();
    render();
  }

  function setSelectedNode(nodeId) {
    appState.selectedNodeId = nodeId;
    appState.selectedEdgeId = null;
    refreshEditors();
    render();
  }
  function setSelectedEdge(edgeId) {
    appState.selectedEdgeId = edgeId;
    appState.selectedNodeId = null;
    refreshEditors();
    render();
  }

  function nextNodeId() { return String(graphState.meta.nextNodeId++); }
  function nextEdgeId() { return String(graphState.meta.nextEdgeId++); }

  function addNode(partial) {
    const id = nextNodeId();
    const name = partial?.name || `节点 ${id}`;
    const category = partial?.category || '其他';
    const pos = computeDefaultNodePosition();
    const x = partial?.x ?? pos.x;
    const y = partial?.y ?? pos.y;
    const node = { id, name, category, x, y };
    graphState.nodes.push(node);
    saveToLocalStorageThrottled();
    return node;
  }

  function addEdge(sourceId, targetId, label) {
    if (!getNodeById(sourceId) || !getNodeById(targetId)) return null;
    // avoid duplicate edge same direction and label empty check
    const exists = graphState.edges.some(e => String(e.source) === String(sourceId) && String(e.target) === String(targetId) && (e.label || '') === (label || ''));
    if (exists) return null;
    const id = nextEdgeId();
    const edge = { id, source: String(sourceId), target: String(targetId), label: label || '' };
    graphState.edges.push(edge);
    saveToLocalStorageThrottled();
    return edge;
  }

  function deleteSelected() {
    if (appState.selectedNodeId) {
      const id = String(appState.selectedNodeId);
      graphState.nodes = graphState.nodes.filter(n => String(n.id) !== id);
      graphState.edges = graphState.edges.filter(e => String(e.source) !== id && String(e.target) !== id);
      appState.selectedNodeId = null;
      saveToLocalStorageThrottled();
      render();
      refreshEditors();
      return;
    }
    if (appState.selectedEdgeId) {
      const id = String(appState.selectedEdgeId);
      graphState.edges = graphState.edges.filter(e => String(e.id) !== id);
      appState.selectedEdgeId = null;
      saveToLocalStorageThrottled();
      render();
      refreshEditors();
      return;
    }
  }

  function computeDefaultNodePosition() {
    const rect = chartEl.getBoundingClientRect();
    const x = rect.width / 2 + (Math.random() - 0.5) * 120;
    const y = rect.height / 2 + (Math.random() - 0.5) * 120;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function saveToLocalStorage() {
    try {
      const payload = JSON.stringify(graphState);
      localStorage.setItem(LOCAL_STORAGE_KEY, payload);
    } catch (_) {
      // ignore
    }
  }
  const saveToLocalStorageThrottled = throttle(saveToLocalStorage, 300);

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return false;
      graphState = parsed;
      // defensive defaults
      graphState.meta = graphState.meta || { nextNodeId: 1, nextEdgeId: 1 };
      render();
      return true;
    } catch (_) {
      return false;
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(graphState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'goal-graph.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          alert('JSON 格式不正确');
          return;
        }
        graphState = parsed;
        graphState.meta = graphState.meta || { nextNodeId: 1, nextEdgeId: 1 };
        deselectAll();
        render();
        saveToLocalStorage();
      } catch (e) {
        alert('解析失败：' + (e?.message || e));
      }
    };
    reader.readAsText(file);
  }

  function refreshEditors() {
    const node = appState.selectedNodeId ? getNodeById(appState.selectedNodeId) : null;
    const edge = appState.selectedEdgeId ? getEdgeById(appState.selectedEdgeId) : null;
    selectionEmpty.style.display = node || edge ? 'none' : '';

    if (node) {
      nodeEditor.style.display = '';
      nodeIdSpan.textContent = String(node.id);
      nodeNameInput.value = node.name || '';
      nodeCategorySelect.value = node.category || '其他';
      nodeXInput.value = Math.round(node.x || 0);
      nodeYInput.value = Math.round(node.y || 0);
    } else {
      nodeEditor.style.display = 'none';
    }

    if (edge) {
      edgeEditor.style.display = '';
      edgeIdSpan.textContent = String(edge.id);
      edgeEndsSpan.textContent = `${edge.source} → ${edge.target}`;
      edgeLabelInput.value = edge.label || '';
    } else {
      edgeEditor.style.display = 'none';
    }
  }

  function updateNodeFromEditor() {
    const node = appState.selectedNodeId ? getNodeById(appState.selectedNodeId) : null;
    if (!node) return;
    node.name = String(nodeNameInput.value || '').trim() || node.name;
    node.category = String(nodeCategorySelect.value || '其他');
    const x = Number(nodeXInput.value);
    const y = Number(nodeYInput.value);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      node.x = x; node.y = y;
    }
    saveToLocalStorage();
    render();
  }

  function updateEdgeFromEditor() {
    const edge = appState.selectedEdgeId ? getEdgeById(appState.selectedEdgeId) : null;
    if (!edge) return;
    edge.label = String(edgeLabelInput.value || '');
    saveToLocalStorage();
    render();
  }

  function toggleConnectMode() {
    if (appState.mode !== 'graph') return;
    appState.interactionMode = appState.interactionMode === 'connect' ? 'select' : 'connect';
    if (appState.interactionMode === 'select') {
      appState.pendingSourceNodeId = null;
    }
    updateStatus();
  }

  function ensureTreeRoot() {
    if (appState.treeRootId && getNodeById(appState.treeRootId)) return appState.treeRootId;
    const fallback = graphState.nodes[0]?.id || null;
    appState.treeRootId = fallback;
    return fallback;
  }

  function enterTreeView() {
    if (graphState.nodes.length === 0) return;
    appState.mode = 'tree';
    btnBackToGraph.style.display = '';
    btnTreeView.style.display = 'none';
    btnConnectMode.disabled = true;
    btnAddNode.disabled = true;
    btnDeleteSelected.disabled = true;
    render();
    updateStatus();
  }

  function backToGraphView() {
    appState.mode = 'graph';
    btnBackToGraph.style.display = 'none';
    btnTreeView.style.display = '';
    btnConnectMode.disabled = false;
    btnAddNode.disabled = false;
    btnDeleteSelected.disabled = false;
    render();
    updateStatus();
  }

  function buildTreeData(rootId) {
    const idToChildren = new Map();
    for (const n of graphState.nodes) idToChildren.set(String(n.id), []);
    for (const e of graphState.edges) {
      const s = String(e.source); const t = String(e.target);
      if (!idToChildren.has(s)) idToChildren.set(s, []);
      idToChildren.get(s).push(t);
    }
    const visited = new Set();
    function dfs(currentId) {
      if (visited.has(String(currentId))) return null;
      visited.add(String(currentId));
      const node = getNodeById(currentId);
      if (!node) return null;
      const childrenIds = idToChildren.get(String(currentId)) || [];
      const children = [];
      for (const cid of childrenIds) {
        if (!visited.has(String(cid))) {
          const child = dfs(cid);
          if (child) children.push(child);
        }
      }
      return { name: node.name || String(node.id), value: String(node.id), children };
    }
    return dfs(rootId);
  }

  function render() {
    if (appState.mode === 'graph') {
      renderGraph();
    } else {
      renderTree();
    }
  }

  function renderGraph() {
    const categories = Object.keys(categoryToColor).map((name) => ({ name }));

    const data = graphState.nodes.map((n) => ({
      id: String(n.id),
      name: n.name || String(n.id),
      x: n.x,
      y: n.y,
      category: n.category || '其他',
      draggable: true,
      symbolSize: 56,
      label: { show: true },
      itemStyle: {
        color: categoryToColor[n.category] || '#607d8b',
        borderColor: String(appState.selectedNodeId) === String(n.id) ? '#ff5252' : '#fff',
        borderWidth: String(appState.selectedNodeId) === String(n.id) ? 3 : 1,
      },
    }));

    const links = graphState.edges.map((e) => ({
      id: String(e.id),
      source: String(e.source),
      target: String(e.target),
      lineStyle: {
        color: String(appState.selectedEdgeId) === String(e.id) ? '#ff5252' : '#9e9e9e',
        width: String(appState.selectedEdgeId) === String(e.id) ? 3 : 1.5,
        curveness: 0.15,
      },
      label: { show: !!e.label },
      edgeLabel: { show: !!e.label },
      // echarts uses 'label' for nodes; for edge label use edgeLabel with formatter
      // We'll pass label in data and format via formatter
      value: e.label || '',
      payload: e,
    }));

    /** @type {import('echarts').EChartsOption} */
    const option = {
      animation: false,
      tooltip: { show: true },
      series: [
        {
          type: 'graph',
          layout: 'none',
          roam: true,
          focusNodeAdjacency: true,
          selectedMode: false,
          edgeSymbol: ['circle', 'arrow'],
          edgeSymbolSize: [4, 12],
          categories,
          data,
          links,
          lineStyle: { opacity: 0.9 },
          edgeLabel: {
            show: true,
            fontSize: 12,
            formatter: function(params) { return params?.data?.value || ''; },
          },
          label: { position: 'right' },
        },
      ],
    };

    chart.setOption(option, true);
  }

  function renderTree() {
    const rootId = ensureTreeRoot();
    if (!rootId) return;
    const tree = buildTreeData(rootId);
    /** @type {import('echarts').EChartsOption} */
    const option = {
      animation: false,
      series: [
        {
          type: 'tree',
          data: [tree || {}],
          top: '5%',
          left: '8%',
          bottom: '5%',
          right: '20%',
          symbolSize: 12,
          orient: 'LR',
          expandAndCollapse: true,
          initialTreeDepth: -1,
          label: { position: 'left', verticalAlign: 'middle', align: 'right', fontSize: 13 },
          leaves: { label: { position: 'right', align: 'left' } },
          lineStyle: { color: '#9e9e9e' },
        },
      ],
    };
    chart.setOption(option, true);
  }

  // Events
  btnAddNode.addEventListener('click', () => {
    const node = addNode({ category: '其他' });
    setSelectedNode(node.id);
  });

  btnDeleteSelected.addEventListener('click', () => {
    deleteSelected();
  });

  btnConnectMode.addEventListener('click', () => {
    toggleConnectMode();
  });

  btnSave.addEventListener('click', () => {
    saveToLocalStorage();
    alert('已保存到浏览器本地');
  });

  btnLoad.addEventListener('click', () => {
    const ok = loadFromLocalStorage();
    alert(ok ? '已从本地加载' : '没有可用的本地数据');
  });

  btnExport.addEventListener('click', () => exportJson());

  document.querySelector('label.import-label').addEventListener('click', () => fileImport.click());
  fileImport.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importJsonFile(file);
    fileImport.value = '';
  });

  btnTreeView.addEventListener('click', () => enterTreeView());
  btnBackToGraph.addEventListener('click', () => backToGraphView());

  btnUpdateNode.addEventListener('click', () => updateNodeFromEditor());
  btnSetTreeRoot.addEventListener('click', () => {
    if (appState.selectedNodeId) {
      appState.treeRootId = String(appState.selectedNodeId);
      if (appState.mode === 'tree') render();
      updateStatus();
    }
  });

  btnUpdateEdge.addEventListener('click', () => updateEdgeFromEditor());

  // Keyboard delete
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && appState.mode === 'graph') {
      deleteSelected();
    }
  });

  // Chart interactions
  chart.on('click', (params) => {
    if (appState.mode !== 'graph') return;
    if (params.dataType === 'node') {
      const nodeId = params.data?.id || params.data?.value || params.data?.name;
      if (appState.interactionMode === 'connect') {
        if (!appState.pendingSourceNodeId) {
          appState.pendingSourceNodeId = String(nodeId);
        } else {
          if (String(appState.pendingSourceNodeId) !== String(nodeId)) {
            addEdge(appState.pendingSourceNodeId, String(nodeId));
          }
          appState.pendingSourceNodeId = null;
        }
        updateStatus();
        render();
      } else {
        setSelectedNode(String(nodeId));
      }
    } else if (params.dataType === 'edge') {
      const edgeId = params.data?.id || params.data?.payload?.id;
      setSelectedEdge(String(edgeId));
    } else {
      deselectAll();
    }
  });

  // Track drag end to persist positions
  chart.getZr().on('mouseup', (zrEvent) => {
    if (appState.mode !== 'graph') return;
    // The graph series updates node positions internally; after drag, we can read current option
    const option = chart.getOption();
    const series = option && option.series && option.series[0];
    if (!series || series.type !== 'graph') return;
    const data = series.data || [];
    let changed = false;
    for (const d of data) {
      const id = d.id;
      const node = getNodeById(id);
      if (node && typeof d.x === 'number' && typeof d.y === 'number') {
        if (node.x !== d.x || node.y !== d.y) {
          node.x = Math.round(d.x);
          node.y = Math.round(d.y);
          changed = true;
        }
      }
    }
    if (changed) saveToLocalStorageThrottled();
  });

  // Resize
  window.addEventListener('resize', () => chart.resize());

  // Initialize
  function init() {
    const loaded = loadFromLocalStorage();
    if (!loaded) {
      // seed minimal sample
      const a = addNode({ name: '目标A', category: '目标', x: 160, y: 160 });
      const b = addNode({ name: '子目标B', category: '子目标', x: 380, y: 260 });
      const c = addNode({ name: '任务C', category: '任务', x: 380, y: 60 });
      addEdge(a.id, b.id, '包含');
      addEdge(a.id, c.id, '包含');
      saveToLocalStorage();
    }
    render();
    updateStatus();
  }

  // Utilities
  function throttle(fn, wait) {
    let timer = null; let lastArgs = null;
    return function throttled(...args) {
      lastArgs = args;
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        fn.apply(null, lastArgs);
      }, wait);
    };
  }

  // Public API for AI/算法/外部脚本
  const graphApi = {
    getGraph() { return JSON.parse(JSON.stringify(graphState)); },
    setGraph(newGraph) {
      if (!newGraph || !Array.isArray(newGraph.nodes) || !Array.isArray(newGraph.edges)) return false;
      graphState = JSON.parse(JSON.stringify(newGraph));
      graphState.meta = graphState.meta || { nextNodeId: 1, nextEdgeId: 1 };
      deselectAll();
      render();
      saveToLocalStorage();
      window.dispatchEvent(new CustomEvent('graphChanged', { detail: graphApi.getGraph() }));
      return true;
    },
    applyOperations(ops) {
      if (!Array.isArray(ops)) return false;
      for (const op of ops) {
        try {
          switch (op?.type) {
            case 'addNode': {
              const node = addNode(op.props || {});
              if (op.select) setSelectedNode(node.id);
              break;
            }
            case 'deleteNode': {
              const id = op.id || op.nodeId;
              if (!id) break;
              if (String(appState.selectedNodeId) === String(id)) appState.selectedNodeId = null;
              graphState.nodes = graphState.nodes.filter(n => String(n.id) !== String(id));
              graphState.edges = graphState.edges.filter(e => String(e.source) !== String(id) && String(e.target) !== String(id));
              break;
            }
            case 'updateNode': {
              const id = op.id || op.nodeId; const patch = op.props || {};
              const node = id ? getNodeById(id) : null; if (!node) break;
              Object.assign(node, patch);
              break;
            }
            case 'moveNode': {
              const id = op.id || op.nodeId; const x = op.x; const y = op.y;
              const node = id ? getNodeById(id) : null; if (!node) break;
              if (Number.isFinite(x)) node.x = Math.round(x);
              if (Number.isFinite(y)) node.y = Math.round(y);
              break;
            }
            case 'addEdge': {
              const s = op.sourceId || op.source; const t = op.targetId || op.target; const label = op.label || '';
              addEdge(s, t, label);
              break;
            }
            case 'deleteEdge': {
              const id = op.id || op.edgeId;
              if (id) {
                graphState.edges = graphState.edges.filter(e => String(e.id) !== String(id));
              } else {
                const s = op.sourceId || op.source; const t = op.targetId || op.target;
                graphState.edges = graphState.edges.filter(e => !(String(e.source) === String(s) && String(e.target) === String(t)));
              }
              break;
            }
            case 'updateEdge': {
              const id = op.id || op.edgeId; const patch = op.props || {};
              const edge = id ? getEdgeById(id) : null; if (!edge) break;
              Object.assign(edge, patch);
              break;
            }
            case 'resetGraph': {
              graphState = { nodes: [], edges: [], meta: { nextNodeId: 1, nextEdgeId: 1 } };
              break;
            }
            default:
              break;
          }
        } catch (_) { /* ignore op errors */ }
      }
      render();
      saveToLocalStorage();
      window.dispatchEvent(new CustomEvent('graphChanged', { detail: graphApi.getGraph() }));
      return true;
    },
    // Window messaging hook
    enablePostMessage() {
      window.addEventListener('message', (evt) => {
        const data = evt?.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'graphOps' && Array.isArray(data.ops)) {
          graphApi.applyOperations(data.ops);
        } else if (data.type === 'setGraph' && data.graph) {
          graphApi.setGraph(data.graph);
        }
      });
    },
  };
  window.graphApi = graphApi;

  init();
})();
