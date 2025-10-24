class GoalDecompositionTool {
    constructor() {
        this.chart = null;
        this.graphData = {
            nodes: [],
            edges: []
        };
        this.nodeIdCounter = 1;
        this.edgeIdCounter = 1;
        this.isConnecting = false;
        this.connectingFrom = null;
        this.selectedNode = null;
        this.isTreeMode = false;
        
        this.init();
    }

    init() {
        this.initChart();
        this.bindEvents();
        this.loadDefaultData();
    }

    initChart() {
        const chartDom = document.getElementById('graphChart');
        this.chart = echarts.init(chartDom);
        
        this.updateChart();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.chart.resize();
        });
    }

    bindEvents() {
        // 工具栏按钮事件
        document.getElementById('addNodeBtn').addEventListener('click', () => this.addNode());
        document.getElementById('addEdgeBtn').addEventListener('click', () => this.toggleConnecting());
        document.getElementById('treeModeBtn').addEventListener('click', () => this.switchToTreeMode());
        document.getElementById('graphModeBtn').addEventListener('click', () => this.switchToGraphMode());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveData());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadData());
        document.getElementById('aiSuggestBtn').addEventListener('click', () => this.showAISuggestions());
        document.getElementById('generateSuggestion').addEventListener('click', () => this.generateAISuggestion());
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeGraph());

        // 模态框事件
        document.getElementById('nodeForm').addEventListener('submit', (e) => this.saveNode(e));
        document.getElementById('deleteNodeBtn').addEventListener('click', () => this.deleteNode());
        document.getElementById('cancelNodeBtn').addEventListener('click', () => this.closeModal());
        document.querySelector('.close').addEventListener('click', () => this.closeModal());

        // 文件输入事件
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileLoad(e));

        // 图表事件
        this.chart.on('click', (params) => this.handleChartClick(params));
        this.chart.on('mousedown', (params) => this.handleMouseDown(params));
        this.chart.on('mouseup', (params) => this.handleMouseUp(params));
        this.chart.on('contextmenu', (params) => this.handleRightClick(params));
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    loadDefaultData() {
        // 加载默认示例数据
        this.graphData = {
            nodes: [
                {
                    id: 1,
                    name: '科研项目目标',
                    type: 'goal',
                    description: '完成一个创新的科研项目',
                    priority: 'high',
                    x: 400,
                    y: 100
                },
                {
                    id: 2,
                    name: '需求分析',
                    type: 'requirement',
                    description: '分析用户需求和系统需求',
                    priority: 'high',
                    x: 200,
                    y: 250
                },
                {
                    id: 3,
                    name: '产品设计',
                    type: 'task',
                    description: '设计产品架构和功能模块',
                    priority: 'high',
                    x: 400,
                    y: 250
                },
                {
                    id: 4,
                    name: '功能开发',
                    type: 'task',
                    description: '实现核心功能模块',
                    priority: 'medium',
                    x: 600,
                    y: 250
                },
                {
                    id: 5,
                    name: '用户界面',
                    type: 'page',
                    description: '设计用户交互界面',
                    priority: 'medium',
                    x: 300,
                    y: 400
                },
                {
                    id: 6,
                    name: '后端API',
                    type: 'function',
                    description: '开发后端服务接口',
                    priority: 'high',
                    x: 500,
                    y: 400
                }
            ],
            edges: [
                { id: 1, source: 1, target: 2, type: 'dependency' },
                { id: 2, source: 1, target: 3, type: 'dependency' },
                { id: 3, source: 1, target: 4, type: 'dependency' },
                { id: 4, source: 2, target: 5, type: 'influence' },
                { id: 5, source: 3, target: 5, type: 'influence' },
                { id: 6, source: 3, target: 6, type: 'influence' },
                { id: 7, source: 4, target: 6, type: 'dependency' }
            ]
        };
        this.updateChart();
    }

    updateChart() {
        const option = this.isTreeMode ? this.getTreeOption() : this.getGraphOption();
        this.chart.setOption(option, true);
    }

    getGraphOption() {
        const nodes = this.graphData.nodes.map(node => ({
            id: node.id,
            name: node.name,
            category: node.type,
            x: node.x,
            y: node.y,
            symbolSize: this.getNodeSize(node.type),
            itemStyle: {
                color: this.getNodeColor(node.type)
            },
            label: {
                show: true,
                position: 'bottom',
                fontSize: 12,
                fontWeight: 'bold'
            },
            tooltip: {
                formatter: (params) => {
                    const node = this.graphData.nodes.find(n => n.id === params.data.id);
                    return `
                        <div style="padding: 10px;">
                            <h4>${node.name}</h4>
                            <p><strong>类型:</strong> ${this.getTypeLabel(node.type)}</p>
                            <p><strong>优先级:</strong> ${this.getPriorityLabel(node.priority)}</p>
                            <p><strong>描述:</strong> ${node.description || '无'}</p>
                        </div>
                    `;
                }
            }
        }));

        const edges = this.graphData.edges.map(edge => ({
            source: edge.source,
            target: edge.target,
            lineStyle: {
                color: this.getEdgeColor(edge.type),
                width: 2,
                curveness: 0.1
            },
            label: {
                show: true,
                formatter: this.getEdgeLabel(edge.type),
                fontSize: 10
            }
        }));

        return {
            tooltip: {},
            legend: {
                data: ['目标', '任务', '需求', '功能', '页面'],
                top: 'top',
                left: 'left'
            },
            series: [{
                type: 'graph',
                layout: 'none',
                data: nodes,
                links: edges,
                categories: [
                    { name: 'goal', itemStyle: { color: '#ff6b6b' } },
                    { name: 'task', itemStyle: { color: '#4ecdc4' } },
                    { name: 'requirement', itemStyle: { color: '#45b7d1' } },
                    { name: 'function', itemStyle: { color: '#96ceb4' } },
                    { name: 'page', itemStyle: { color: '#feca57' } }
                ],
                roam: true,
                draggable: true,
                focusNodeAdjacency: true,
                lineStyle: {
                    color: 'source',
                    curveness: 0.1
                },
                emphasis: {
                    focus: 'adjacency',
                    lineStyle: {
                        width: 4
                    }
                }
            }]
        };
    }

    getTreeOption() {
        // 将图结构转换为树结构
        const treeData = this.convertToTree();
        
        return {
            tooltip: {
                trigger: 'item',
                triggerOn: 'mousemove'
            },
            series: [{
                type: 'tree',
                data: [treeData],
                layout: 'orthogonal',
                orient: 'TB',
                symbol: 'circle',
                symbolSize: 7,
                roam: true,
                label: {
                    position: 'left',
                    verticalAlign: 'middle',
                    align: 'right',
                    fontSize: 12
                },
                leaves: {
                    label: {
                        position: 'right',
                        verticalAlign: 'middle',
                        align: 'left'
                    }
                },
                emphasis: {
                    focus: 'descendant'
                },
                expandAndCollapse: true,
                animationDuration: 550,
                animationDurationUpdate: 750
            }]
        };
    }

    convertToTree() {
        // 找到根节点（没有入边的节点）
        const rootNodes = this.graphData.nodes.filter(node => 
            !this.graphData.edges.some(edge => edge.target === node.id)
        );
        
        if (rootNodes.length === 0) {
            return { name: '无根节点', children: [] };
        }

        const root = rootNodes[0];
        return this.buildTreeFromNode(root.id);
    }

    buildTreeFromNode(nodeId) {
        const node = this.graphData.nodes.find(n => n.id === nodeId);
        const children = this.graphData.edges
            .filter(edge => edge.source === nodeId)
            .map(edge => this.buildTreeFromNode(edge.target));

        return {
            name: node.name,
            value: node.type,
            children: children.length > 0 ? children : undefined
        };
    }

    addNode() {
        const newNode = {
            id: this.nodeIdCounter++,
            name: '新节点',
            type: 'task',
            description: '',
            priority: 'medium',
            x: Math.random() * 400 + 200,
            y: Math.random() * 300 + 200
        };
        
        this.graphData.nodes.push(newNode);
        this.updateChart();
        this.editNode(newNode.id);
    }

    editNode(nodeId) {
        const node = this.graphData.nodes.find(n => n.id === nodeId);
        if (!node) return;

        this.selectedNode = node;
        
        // 填充表单
        document.getElementById('nodeName').value = node.name;
        document.getElementById('nodeType').value = node.type;
        document.getElementById('nodeDescription').value = node.description || '';
        document.getElementById('nodePriority').value = node.priority;

        // 显示模态框
        document.getElementById('nodeModal').style.display = 'block';
    }

    saveNode(e) {
        e.preventDefault();
        
        if (!this.selectedNode) return;

        // 更新节点数据
        this.selectedNode.name = document.getElementById('nodeName').value;
        this.selectedNode.type = document.getElementById('nodeType').value;
        this.selectedNode.description = document.getElementById('nodeDescription').value;
        this.selectedNode.priority = document.getElementById('nodePriority').value;

        this.updateChart();
        this.closeModal();
    }

    deleteNode() {
        if (!this.selectedNode) return;

        // 删除节点
        this.graphData.nodes = this.graphData.nodes.filter(n => n.id !== this.selectedNode.id);
        
        // 删除相关连线
        this.graphData.edges = this.graphData.edges.filter(e => 
            e.source !== this.selectedNode.id && e.target !== this.selectedNode.id
        );

        this.updateChart();
        this.closeModal();
    }

    toggleConnecting() {
        this.isConnecting = !this.isConnecting;
        const btn = document.getElementById('addEdgeBtn');
        
        if (this.isConnecting) {
            btn.textContent = '取消连线';
            btn.classList.add('connecting');
            document.body.style.cursor = 'crosshair';
        } else {
            btn.textContent = '添加连线';
            btn.classList.remove('connecting');
            document.body.style.cursor = 'default';
        }
    }

    handleChartClick(params) {
        if (params.componentType === 'series' && params.dataType === 'node') {
            if (this.isConnecting) {
                if (this.connectingFrom === null) {
                    this.connectingFrom = params.data.id;
                    // 高亮显示选中的节点
                    this.highlightNode(params.data.id);
                } else if (this.connectingFrom !== params.data.id) {
                    this.addEdge(this.connectingFrom, params.data.id);
                    this.connectingFrom = null;
                    this.toggleConnecting();
                }
            } else {
                this.editNode(params.data.id);
            }
        }
    }

    addEdge(sourceId, targetId) {
        // 检查是否已存在连线
        const existingEdge = this.graphData.edges.find(e => 
            e.source === sourceId && e.target === targetId
        );
        
        if (existingEdge) {
            alert('连线已存在！');
            return;
        }

        const newEdge = {
            id: this.edgeIdCounter++,
            source: sourceId,
            target: targetId,
            type: 'dependency'
        };

        this.graphData.edges.push(newEdge);
        this.updateChart();
    }

    switchToTreeMode() {
        this.isTreeMode = true;
        this.updateChart();
        document.getElementById('treeModeBtn').classList.add('active');
        document.getElementById('graphModeBtn').classList.remove('active');
    }

    switchToGraphMode() {
        this.isTreeMode = false;
        this.updateChart();
        document.getElementById('graphModeBtn').classList.add('active');
        document.getElementById('treeModeBtn').classList.remove('active');
    }

    saveData() {
        const dataStr = JSON.stringify(this.graphData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'goal-decomposition.json';
        link.click();
    }

    loadData() {
        document.getElementById('fileInput').click();
    }

    handleFileLoad(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                this.graphData = data;
                this.updateChart();
                alert('数据加载成功！');
            } catch (error) {
                alert('文件格式错误！');
            }
        };
        reader.readAsText(file);
    }

    showAISuggestions() {
        const panel = document.getElementById('aiSuggestions');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    async generateAISuggestion() {
        const input = document.getElementById('aiInput').value;
        if (!input.trim()) {
            alert('请输入您的目标或需求描述');
            return;
        }

        const generateBtn = document.getElementById('generateSuggestion');
        const originalText = generateBtn.textContent;
        generateBtn.textContent = '生成中...';
        generateBtn.disabled = true;

        try {
            // 模拟AI建议生成
            const suggestions = await this.generateMockAISuggestions(input);
            this.displayAISuggestions(suggestions);
        } catch (error) {
            alert('AI建议生成失败，请重试');
        } finally {
            generateBtn.textContent = originalText;
            generateBtn.disabled = false;
        }
    }

    async generateMockAISuggestions(input) {
        // 模拟AI API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 基于输入内容生成智能建议
        const suggestions = [];
        
        if (input.includes('用户') || input.includes('需求')) {
            suggestions.push({
                type: 'node',
                suggestion: '建议添加"用户研究"节点来深入了解用户需求',
                action: () => this.addSuggestedNode('用户研究', 'requirement', '通过用户调研了解真实需求')
            });
        }
        
        if (input.includes('设计') || input.includes('架构')) {
            suggestions.push({
                type: 'node',
                suggestion: '建议添加"系统架构设计"节点',
                action: () => this.addSuggestedNode('系统架构设计', 'task', '设计整体系统架构和技术选型')
            });
        }
        
        if (input.includes('测试') || input.includes('验证')) {
            suggestions.push({
                type: 'node',
                suggestion: '建议添加"测试验证"节点',
                action: () => this.addSuggestedNode('测试验证', 'task', '进行功能测试和性能验证')
            });
        }
        
        // 分析现有节点关系
        const hasRequirements = this.graphData.nodes.some(n => n.type === 'requirement');
        const hasDesign = this.graphData.nodes.some(n => n.name.includes('设计'));
        
        if (hasRequirements && hasDesign) {
            suggestions.push({
                type: 'edge',
                suggestion: '建议在需求分析和产品设计之间建立依赖关系',
                action: () => {
                    const reqNode = this.graphData.nodes.find(n => n.type === 'requirement');
                    const designNode = this.graphData.nodes.find(n => n.name.includes('设计'));
                    if (reqNode && designNode) {
                        this.addEdge(reqNode.id, designNode.id);
                    }
                }
            });
        }
        
        // 检查是否有孤立节点
        const isolatedNodes = this.graphData.nodes.filter(node => 
            !this.graphData.edges.some(edge => edge.source === node.id || edge.target === node.id)
        );
        
        if (isolatedNodes.length > 1) {
            suggestions.push({
                type: 'structure',
                suggestion: `发现${isolatedNodes.length}个孤立节点，建议建立连接关系`,
                action: () => {
                    // 自动连接第一个孤立节点到根节点
                    const rootNode = this.graphData.nodes.find(n => 
                        !this.graphData.edges.some(edge => edge.target === n.id)
                    );
                    if (rootNode && isolatedNodes[0] && isolatedNodes[0].id !== rootNode.id) {
                        this.addEdge(rootNode.id, isolatedNodes[0].id);
                    }
                }
            });
        }
        
        // 如果没有其他建议，提供通用建议
        if (suggestions.length === 0) {
            suggestions.push({
                type: 'structure',
                suggestion: '建议将项目分解为更细粒度的子任务',
                action: () => this.addSuggestedNode('详细设计', 'task', '完成详细的技术设计文档')
            });
        }
        
        return suggestions;
    }

    addSuggestedNode(name, type, description) {
        const newNode = {
            id: this.nodeIdCounter++,
            name: name,
            type: type,
            description: description,
            priority: 'medium',
            x: Math.random() * 400 + 200,
            y: Math.random() * 300 + 200
        };
        
        this.graphData.nodes.push(newNode);
        this.updateChart();
    }

    displayAISuggestions(suggestions) {
        const resultDiv = document.getElementById('suggestionResult');
        resultDiv.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #4CAF50;">
                <p style="margin-bottom: 5px;">${suggestion.suggestion}</p>
                <button onclick="app.applySuggestion(${index})" class="btn btn-primary" style="padding: 5px 10px; font-size: 12px;">应用建议</button>
            </div>
        `).join('');
        
        this.currentSuggestions = suggestions;
        resultDiv.style.display = 'block';
    }

    applySuggestion(index) {
        if (this.currentSuggestions && this.currentSuggestions[index]) {
            this.currentSuggestions[index].action();
            document.getElementById('suggestionResult').style.display = 'none';
        }
    }

    analyzeGraph() {
        const analysis = this.performGraphAnalysis();
        this.displayAnalysis(analysis);
    }

    performGraphAnalysis() {
        const nodes = this.graphData.nodes;
        const edges = this.graphData.edges;
        
        // 计算基本统计信息
        const nodeCount = nodes.length;
        const edgeCount = edges.length;
        
        // 按类型统计节点
        const nodeTypeStats = {};
        nodes.forEach(node => {
            nodeTypeStats[node.type] = (nodeTypeStats[node.type] || 0) + 1;
        });
        
        // 计算节点度（连接数）
        const nodeDegrees = {};
        nodes.forEach(node => {
            const inDegree = edges.filter(e => e.target === node.id).length;
            const outDegree = edges.filter(e => e.source === node.id).length;
            nodeDegrees[node.id] = { in: inDegree, out: outDegree, total: inDegree + outDegree };
        });
        
        // 找到关键节点（高度数节点）
        const criticalNodes = Object.entries(nodeDegrees)
            .filter(([id, degree]) => degree.total > 2)
            .map(([id, degree]) => {
                const node = nodes.find(n => n.id == id);
                return { ...node, ...degree };
            })
            .sort((a, b) => b.total - a.total);
        
        // 检查孤立节点
        const isolatedNodes = nodes.filter(node => 
            !edges.some(edge => edge.source === node.id || edge.target === node.id)
        );
        
        // 检查循环依赖
        const hasCycles = this.detectCycles();
        
        // 计算图的密度
        const maxPossibleEdges = nodeCount * (nodeCount - 1);
        const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
        
        return {
            nodeCount,
            edgeCount,
            nodeTypeStats,
            criticalNodes: criticalNodes.slice(0, 5), // 只显示前5个
            isolatedNodes,
            hasCycles,
            density: Math.round(density * 100) / 100,
            recommendations: this.generateAnalysisRecommendations(isolatedNodes, hasCycles, density)
        };
    }

    detectCycles() {
        const visited = new Set();
        const recStack = new Set();
        
        const dfs = (nodeId) => {
            if (recStack.has(nodeId)) return true;
            if (visited.has(nodeId)) return false;
            
            visited.add(nodeId);
            recStack.add(nodeId);
            
            const outgoingEdges = this.graphData.edges.filter(e => e.source === nodeId);
            for (const edge of outgoingEdges) {
                if (dfs(edge.target)) return true;
            }
            
            recStack.delete(nodeId);
            return false;
        };
        
        for (const node of this.graphData.nodes) {
            if (!visited.has(node.id)) {
                if (dfs(node.id)) return true;
            }
        }
        return false;
    }

    generateAnalysisRecommendations(isolatedNodes, hasCycles, density) {
        const recommendations = [];
        
        if (isolatedNodes.length > 0) {
            recommendations.push({
                type: 'warning',
                message: `发现${isolatedNodes.length}个孤立节点，建议建立连接关系`
            });
        }
        
        if (hasCycles) {
            recommendations.push({
                type: 'error',
                message: '检测到循环依赖，可能影响项目执行顺序'
            });
        }
        
        if (density < 0.1) {
            recommendations.push({
                type: 'info',
                message: '图密度较低，建议增加节点间的连接关系'
            });
        } else if (density > 0.8) {
            recommendations.push({
                type: 'info',
                message: '图密度较高，可能存在过度连接'
            });
        }
        
        if (this.graphData.nodes.length < 3) {
            recommendations.push({
                type: 'info',
                message: '节点数量较少，建议进一步细化目标分解'
            });
        }
        
        return recommendations;
    }

    displayAnalysis(analysis) {
        const resultDiv = document.getElementById('analysisResult');
        
        const recommendationsHtml = analysis.recommendations.map(rec => `
            <div class="recommendation ${rec.type}" style="
                padding: 8px 12px;
                margin: 5px 0;
                border-radius: 4px;
                border-left: 4px solid ${
                    rec.type === 'error' ? '#e74c3c' :
                    rec.type === 'warning' ? '#f39c12' : '#3498db'
                };
                background: ${
                    rec.type === 'error' ? '#fdf2f2' :
                    rec.type === 'warning' ? '#fef9e7' : '#f0f8ff'
                };
            ">
                ${rec.message}
            </div>
        `).join('');
        
        const criticalNodesHtml = analysis.criticalNodes.map(node => `
            <div style="padding: 5px 0; border-bottom: 1px solid #eee;">
                <strong>${node.name}</strong> (${this.getTypeLabel(node.type)})
                <br><small>连接数: ${node.total} | 入度: ${node.in} | 出度: ${node.out}</small>
            </div>
        `).join('');
        
        resultDiv.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h4>基本统计</h4>
                <p>节点数: ${analysis.nodeCount} | 边数: ${analysis.edgeCount} | 密度: ${analysis.density}</p>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4>节点类型分布</h4>
                ${Object.entries(analysis.nodeTypeStats).map(([type, count]) => 
                    `<span style="display: inline-block; margin: 2px 5px; padding: 2px 8px; background: #e9ecef; border-radius: 12px; font-size: 12px;">
                        ${this.getTypeLabel(type)}: ${count}
                    </span>`
                ).join('')}
            </div>
            
            ${analysis.criticalNodes.length > 0 ? `
                <div style="margin-bottom: 15px;">
                    <h4>关键节点</h4>
                    ${criticalNodesHtml}
                </div>
            ` : ''}
            
            <div>
                <h4>分析建议</h4>
                ${recommendationsHtml}
            </div>
        `;
    }

    closeModal() {
        document.getElementById('nodeModal').style.display = 'none';
        this.selectedNode = null;
    }

    // 辅助方法
    getNodeSize(type) {
        const sizes = {
            'goal': 50,
            'task': 40,
            'requirement': 35,
            'function': 35,
            'page': 30
        };
        return sizes[type] || 30;
    }

    getNodeColor(type) {
        const colors = {
            'goal': '#ff6b6b',
            'task': '#4ecdc4',
            'requirement': '#45b7d1',
            'function': '#96ceb4',
            'page': '#feca57'
        };
        return colors[type] || '#95a5a6';
    }

    getEdgeColor(type) {
        const colors = {
            'dependency': '#e74c3c',
            'influence': '#3498db',
            'sequence': '#2ecc71'
        };
        return colors[type] || '#95a5a6';
    }

    getEdgeLabel(type) {
        const labels = {
            'dependency': '依赖',
            'influence': '影响',
            'sequence': '顺序'
        };
        return labels[type] || '';
    }

    getTypeLabel(type) {
        const labels = {
            'goal': '目标',
            'task': '任务',
            'requirement': '需求',
            'function': '功能',
            'page': '页面'
        };
        return labels[type] || type;
    }

    getPriorityLabel(priority) {
        const labels = {
            'high': '高',
            'medium': '中',
            'low': '低'
        };
        return labels[priority] || priority;
    }

    highlightNode(nodeId) {
        // 实现节点高亮逻辑
        console.log('Highlighting node:', nodeId);
    }

    handleRightClick(params) {
        if (params.componentType === 'series' && params.dataType === 'node') {
            this.showContextMenu(params.event.event, params.data.id);
        }
    }

    showContextMenu(event, nodeId) {
        // 移除现有菜单
        const existingMenu = document.getElementById('contextMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // 创建右键菜单
        const menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.style.cssText = `
            position: fixed;
            left: ${event.clientX}px;
            top: ${event.clientY}px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 120px;
        `;

        const menuItems = [
            { text: '编辑节点', action: () => this.editNode(nodeId) },
            { text: '删除节点', action: () => this.deleteNodeById(nodeId) },
            { text: '添加子节点', action: () => this.addChildNode(nodeId) },
            { text: '复制节点', action: () => this.duplicateNode(nodeId) }
        ];

        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.textContent = item.text;
            menuItem.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
            `;
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.backgroundColor = '#f5f5f5';
            });
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.backgroundColor = 'white';
            });
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            menu.appendChild(menuItem);
        });

        document.body.appendChild(menu);

        // 点击其他地方关闭菜单
        setTimeout(() => {
            document.addEventListener('click', () => {
                if (menu.parentNode) {
                    menu.remove();
                }
            }, { once: true });
        }, 0);
    }

    deleteNodeById(nodeId) {
        if (confirm('确定要删除这个节点吗？')) {
            this.graphData.nodes = this.graphData.nodes.filter(n => n.id !== nodeId);
            this.graphData.edges = this.graphData.edges.filter(e => 
                e.source !== nodeId && e.target !== nodeId
            );
            this.updateChart();
        }
    }

    addChildNode(parentId) {
        const parentNode = this.graphData.nodes.find(n => n.id === parentId);
        if (!parentNode) return;

        const childNode = {
            id: this.nodeIdCounter++,
            name: '子节点',
            type: 'task',
            description: '',
            priority: 'medium',
            x: parentNode.x + 100,
            y: parentNode.y + 100
        };

        this.graphData.nodes.push(childNode);
        this.addEdge(parentId, childNode.id);
        this.updateChart();
        this.editNode(childNode.id);
    }

    duplicateNode(nodeId) {
        const originalNode = this.graphData.nodes.find(n => n.id === nodeId);
        if (!originalNode) return;

        const duplicatedNode = {
            ...originalNode,
            id: this.nodeIdCounter++,
            name: originalNode.name + ' (副本)',
            x: originalNode.x + 50,
            y: originalNode.y + 50
        };

        this.graphData.nodes.push(duplicatedNode);
        this.updateChart();
    }

    handleKeyDown(e) {
        if (e.key === 'Delete' && this.selectedNode) {
            this.deleteNodeById(this.selectedNode.id);
        } else if (e.key === 'Escape') {
            this.closeModal();
            this.toggleConnecting();
        }
    }
}

// 初始化应用
const app = new GoalDecompositionTool();