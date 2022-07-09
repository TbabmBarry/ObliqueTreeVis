import * as d3 from 'd3';
import { color, select } from 'd3';
import _, { random } from 'lodash';
import textures from 'textures';

class Odt {
    static initClass() {
        this.diagramIndex = 0;
        this.diagramName = "odt";
    }

    constructor(unsanitisedElement) {
        this.id = `${Odt.diagramName}-${Odt.diagramIndex}`;
        this.rootElement = _.has(unsanitisedElement, 'length') ? document.querySelector(unsanitisedElement[0]) : document.createElement('div');
        this.registeredStateListeners = [];
        // Bind listeners to self

    }

    /**
     * Initialize Oblique Tree View, including clearing state listeners,
     * updating the container, and reassign this.
     * @date 2022-06-14
     */
    init() {
        // Unregister existing listeners
        this.registeredStateListeners.forEach(dergisterFn => dergisterFn());
        this.rootElement.innerHTML = '';
        // Clear DOM (such as d3-tip)

        // Reset container dimensions
        this.updateContainerDimensions();

        _.assign(this, {
            data: null,
            nodes: null,
            trainX: null,
            trainY: null,
            opts: null,
            selectedPoints: [],
            exposedFlowLinks: [],
            uniqueDecisionPaths: [],
            registeredStateListeners: [],
            computed: {},
            constants: {
                nameFontSize: 10,
                nameFontFamily: 'sans-serif',
                minZoom: 0.1,
                maxZoom: 50,
                nodeRectRatio: 25,
                leafNodeRectRatio: 0,
                nodeRectWidth: 250,
                detailedViewNodeRectWidth: 360,
                histogramHeight: 60,
                scatterPlotPadding: 20,
                histogramScatterPlotPadding: 10,
                nodeRectStrokeWidth: 3,
                leafNodeRectStrokeWidth: 6,
                colorScale: ["#e63946", "#a8dadc", "#457b9d"],
                featureColorScale: d3.scaleOrdinal(["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab"]),
                featureArr: Array.from({length: 8}, (_, i) => `f_${i+1}`),
                maxCollisionResolutionAttempts: 7,
                transitionDuration: 400,
                treeMargins: { top: 5, left: 10, bottom: 5, right: 10 },
            },
            parts: {},
        })
    }


    /**
     * Update Oblique Tree View according to information about
     * the size of DOMRect element and its position relative to
     * the viewport.
     * @date 2022-06-14
     */
    updateContainerDimensions() {
        try {
            const { width, height } = adjustedClientRect(this.rootElement);
            _.assign(this, { width, height });
        } catch (err) {
            err.message = `Fail to reset the container: ${err.message}`;
            throw err;
        }
    }

    draw() {
        const { data, parts, height, width } = this;
        
        // Create the base svg binding it to rootElement
        parts.baseSvg = d3.select(this.rootElement)
            .append('svg')
            .attr('id', this.id)
            .attr('class', 'oblique-tree-view')
            .attr('width', width)
            .attr('height', height);

        // Create a container to group other tree diagram related svg elements
        parts.svgGroup = parts.baseSvg
                            .append('g')
                            .attr('class', 'oblique-tree-group')

        parts.treeMap = d3.tree().size([width, height]);
        let nodes = d3.hierarchy(data);
        nodes = parts.treeMap(nodes);
        this.nodes = nodes;
        // Modify element for each node recursively
        traverseTree(nodes);
        
        // Render Oblique Tree Links and Nodes
        this.renderLinks(nodes.descendants().slice(1));
        this.renderNodes(nodes.descendants());

        // Enable zooming
        this.enableZooming();
    }

    /**
     * Update Oblique Tree View accordingly.
     * @date 2022-06-14
     * @param {any} parm1
     */
    update(status = "on") {
        const { parts, trainY, trainX, selectedPoints, exposedFlowLinks, uniqueDecisionPaths, 
            constants: { nodeRectWidth, nodeRectRatio, nodeRectStrokeWidth, colorScale } } = this;
        switch (status) {
            case "on":
                // Remove all exposed flow links
                parts.svgGroup.selectAll("path.exposed-flow-link").remove();

                // Remove all exposed split distribution rects 
                parts.svgGroup.selectAll("g.exposed-split-distribution").remove();
                
                // Update all the links and nodes' opacity to 0.4 in the vis 
                d3.selectAll("g.node--internal")
                    .style("opacity", 0.4);
                d3.selectAll("g.node--leaf")
                    .style("opacity", 0.4);
                d3.selectAll("path.link")
                    .style("opacity", 0.4);

                d3.selectAll("circle.detailed.dot")
                    .style("fill", "white");
                selectedPoints.forEach((id) => {
                    d3.selectAll(`circle#dot-${id}`)
                        .style("fill", colorScale[trainY[id]]);
                });

                // Update related links and nodes' opacity to 1 in the vis
                exposedFlowLinks.forEach((exposedFlowLink) => {
                    // Hightlight the full width exposed flow link with opacity 0.8
                    d3.selectAll(`path.link#${exposedFlowLink.pathId}`)
                        .style("opacity", 0.8);
                    // Highlight the exposed flow link by drawing a new link over the old one
                    if (parts.svgGroup.node().querySelector(".detailed") === null) {
                        this.renderExposedLinks(parts.svgGroup, exposedFlowLink, nodeRectStrokeWidth, colorScale);
                    }
                });
                uniqueDecisionPaths?.forEach((uniqueDecisionPath) => {
                    let idArr = uniqueDecisionPath.idArr.slice();
                    uniqueDecisionPath?.path.forEach((decisionNode) => {
                        let currNodeData = d3.selectAll(`g.node#${decisionNode}`).data()[0].data;
                        const decisionNodeData = {
                            data: {
                                totalCount: new Array(3).fill(0),
                                leftCount: new Array(3).fill(0),
                                rightCount: new Array(3).fill(0),
                                subTrainingSet: []
                            }
                        };
                        idArr.forEach((id) => {
                            if (currNodeData.subTrainingSet.includes(id)) {
                                decisionNodeData.data.subTrainingSet.push(id);
                                decisionNodeData.data.totalCount[uniqueDecisionPath.label]++;
                            }
                        });
                        decisionNodeData.data.subTrainingSet.forEach((id) => {
                            if (currNodeData.type === "decision") {
                                let X = Object.values(trainX[id]);
                                let sum = currNodeData.split[currNodeData.split.length-1];
                                sum += X.map((val, i) => val*currNodeData.split[i]).reduce((a, b) => a+b);
                                if (sum < 0) {
                                    decisionNodeData.data.leftCount[uniqueDecisionPath.label]++;
                                } else {
                                    decisionNodeData.data.rightCount[uniqueDecisionPath.label]++;
                                }
                            }
                        });
                        // Select all related svg groups and apply opacity 1
                        const currNodeSvgGroup = d3.select(d3.selectAll(`rect.node-rect#${decisionNode}`).node().parentNode);
                        // Highlight related decision nodes with opacity 1
                        currNodeSvgGroup.style("opacity", 1);
                        if (currNodeSvgGroup.node().querySelector(".detailed") === null) {
                            // Draw new split distribution rects to highlight the selected data points
                            this.drawExposedSplitHistogram(currNodeSvgGroup, currNodeData, decisionNodeData, nodeRectWidth, nodeRectRatio, colorScale);
                        }
                    });
                });
                break;
            case "reset":
                // Recover all nodes and links to their original opacity
                d3.selectAll("path.link")
                    .style("opacity", 1);
                d3.selectAll("g.node--internal")
                    .style("opacity", 1);
                d3.selectAll("g.node--leaf")
                    .style("opacity", 1);
                
                // Remove all exposed flow links
                parts.svgGroup.selectAll("path.exposed-flow-link").remove();

                // Remove all exposed split histograms
                parts.svgGroup.selectAll("g.exposed-split-distribution").remove();

                // Recover circle fill color in scatter plots
                d3.selectAll("circle.detailed.dot")
                    .style("fill", d => colorScale[trainY[d]]);
                break;
            default:
                throw new Error(`Unknown status: ${status}`);
            }
        }


    /**
     * Render sankey-like links according to param links
     * param links should be an array of objects with 
     * length # of classes * # of links in the tree diagram.
     * @date 2022-06-14
     * @param {links} links
     */
    renderLinks(links) {
        const { parts, constants: { colorScale } } = this;
        const flowLinks = this.generateFlows(links);
        parts.svgGroup.selectAll(".link")
            .data(flowLinks)
            .enter().append("path")
            .attr("class", (d) => {
                let currNodeName = d.id.split("-")[0];
                return `link ${currNodeName}`;
            })
            .attr("id", (d) => d.id)
            .attr("d", (d) => {
                return d3.area().curve(d3.curveBumpY).x0(dd => dd.x0).x1(dd => dd.x1).y(dd => dd.y)([
                    {
                        x0: d.source.x - 0.5 * d.source.width,
                        x1: d.source.x + 0.5 * d.source.width,
                        y: d.source.y,
                    },
                    {
                        x0: d.target.x - 0.5 * d.target.width,
                        x1: d.target.x + 0.5 * d.target.width,
                        y: d.target.y,
                    }
                ]);
            })
            .style("fill", (d) => colorScale[d.class])
            .style("stroke", "none");

    }

    /**
     * Render exposed sankey-like nodes according to param nodes
     * @date 2022-07-09
     * @param {targetSelection} targetSelection
     * @param {exposedFlowLink} exposedFlowLink
     * @param {nodeRectStrokeWidth} nodeRectStrokeWidth
     * @param {colorScale} colorScale
     */
    renderExposedLinks(targetSelection, exposedFlowLink, nodeRectStrokeWidth, colorScale) {
        let currLinkData = d3.selectAll(`path.link#${exposedFlowLink.pathId}`).data()[0];
        let currWidth = (exposedFlowLink.count/currLinkData.count)*currLinkData.source.width;
        // Compute flow data for exposed flow link
        const flowLinkData = {
            source: {
                x: currLinkData.source.x-0.5*(currLinkData.source.width-currWidth),
                y: currLinkData.source.y,
                width: currWidth,
            },
            target: {
                x: currLinkData.target.x-0.5*(currLinkData.source.width-currWidth),
                y: currLinkData.target.y,
                width: currWidth,
            },
            class: currLinkData.class,
            id: exposedFlowLink.pathId,
        };
        // Draw new flow path line with the new width
        targetSelection.selectAll("link.exposed-flow-link")
            .data([flowLinkData])
            .enter()
            .append("path")
            .attr("class", (d) => {
                let currNodeName = d.id.split("-")[0];
                return `exposed-flow-link ${currNodeName}`;
            })
            .attr("id", (d) => d.id)
            .attr("d", (d) => {
                return d3.area().curve(d3.curveBumpY).x0(dd => dd.x0).x1(dd => dd.x1).y(dd => dd.y)([
                    {
                        x0: d.source.x - 0.5 * d.source.width,
                        x1: d.source.x + 0.5 * d.source.width,
                        y: d.source.y+0.5*nodeRectStrokeWidth,
                    },
                    {
                        x0: d.target.x - 0.5 * d.target.width,
                        x1: d.target.x + 0.5 * d.target.width,
                        y: exposedFlowLink.pathId.includes("f") 
                            ? d.target.y-0.2*nodeRectStrokeWidth
                            : d.target.y-0.5*nodeRectStrokeWidth,
                    }
                ]);
            })
            .style("fill", (d) => colorScale[d.class])
            .style("stroke", "#000");
    }


    /**
     * Render decision and leaf nodes according to the param nodes 
     * which is an array of node objects.
     * @date 2022-06-14
     * @param {nodes} nodes
     */
    renderNodes(nodes) {
        const { parts, 
            constants: { nodeRectWidth, nodeRectRatio, leafNodeRectRatio, nodeRectStrokeWidth, leafNodeRectStrokeWidth, detailedViewNodeRectWidth, transitionDuration } } = this;
        let _this = this;

        // Click event listener to switch between summary and detailed views
        function clicked(event, node) {
            if (event.shiftKey && node.data.type === "decision") {
                let currNodeGroup = select(this);
                let currNodeName = currNodeGroup.data()[0].data.name;
                if (currNodeGroup.node().querySelector(".detailed") !== null || 
                    (currNodeGroup.node().querySelector(".detailed") === null &&
                        currNodeGroup.node().querySelector(".summary") === null)) {
                    // Remove the detailed view and render the summary view
                    currNodeGroup.selectAll(".detailed").remove();
                    _this.renderSummaryView(currNodeGroup);

                    // Update the flow link position
                    parts.svgGroup.selectAll(`path.${currNodeName}`)
                    .transition()
                    .duration(transitionDuration)
                    .attr("d", (d) => {
                        return d3.area().curve(d3.curveBumpY).x0(dd => dd.x0).x1(dd => dd.x1).y(dd => dd.y)([
                            {
                                x0: d.source.x - 0.5 * d.source.width,
                                x1: d.source.x + 0.5 * d.source.width,
                                y: d.source.y + 0.5*nodeRectStrokeWidth,
                            },
                            {
                                x0: d.target.x - 0.5 * d.target.width,
                                x1: d.target.x + 0.5 * d.target.width,
                                y: d.target.y,
                            }
                        ]);
                    });
                    if (currNodeName !== "root") {
                        let parentNodeName = currNodeGroup.data()[0].parent.data.name;
                        parts.svgGroup.selectAll("path").filter(function() {
                            return d3.select(this).attr("id").includes(`${parentNodeName}-${currNodeName}-`);
                        })
                            .transition()
                            .duration(transitionDuration)
                                .attr("d", (d) => {
                                    return d3.area().curve(d3.curveBumpY).x0(dd => dd.x0).x1(dd => dd.x1).y(dd => dd.y)([
                                        {
                                            x0: d.source.x - 0.5 * d.source.width,
                                            x1: d.source.x + 0.5 * d.source.width,
                                            y: d.source.y + 0.5*nodeRectStrokeWidth,
                                        },
                                        {
                                            x0: d.target.x - 0.5 * d.target.width,
                                            x1: d.target.x + 0.5 * d.target.width,
                                            y: d.target.y,
                                        }
                                    ]);
                                });
                    }
                    // Update the node rect width and stroke width
                    select(this).select(".node-rect")
                    .transition()
                    .duration(transitionDuration)
                        .attr("x", -0.5*nodeRectWidth)
                        .attr("y", 0)
                        .attr("width", nodeRectWidth)
                        .attr("height", nodeRectWidth)
                    .on("end", () => {
                        // Re-render the exposed split histogram and flow links
                        if (_this.uniqueDecisionPaths.length !== 0) {
                            _this.update();
                        } else {
                            _this.update("reset");
                        }
                    })
                } else {
                    // Update the flow link position
                    parts.svgGroup.selectAll(`path.${currNodeName}`)
                    .transition()
                    .duration(transitionDuration)
                    .attr("d", (d) => {
                        return d3.area().curve(d3.curveBumpY).x0(dd => dd.x0).x1(dd => dd.x1).y(dd => dd.y)([
                            {
                                x0: d.source.x - 0.5 * d.source.width,
                                x1: d.source.x + 0.5 * d.source.width,
                                y: d.source.y + 0.5*(detailedViewNodeRectWidth-nodeRectWidth) + 0.5*nodeRectStrokeWidth,
                            },
                            {
                                x0: d.target.x - 0.5 * d.target.width,
                                x1: d.target.x + 0.5 * d.target.width,
                                y: d.target.y,
                            }
                        ]);
                    });
                    if (currNodeName !== "root") {
                        let parentNodeName = currNodeGroup.data()[0].parent.data.name;
                        parts.svgGroup.selectAll("path").filter(function() {
                            return d3.select(this).attr("id").includes(`${parentNodeName}-${currNodeName}-`);
                        })
                            .transition()
                            .duration(transitionDuration)
                                .attr("d", (d) => {
                                    return d3.area().curve(d3.curveBumpY).x0(dd => dd.x0).x1(dd => dd.x1).y(dd => dd.y)([
                                        {
                                            x0: d.source.x - 0.5 * d.source.width,
                                            x1: d.source.x + 0.5 * d.source.width,
                                            y: d.source.y + 0.5*nodeRectStrokeWidth,
                                        },
                                        {
                                            x0: d.target.x - 0.5 * d.target.width,
                                            x1: d.target.x + 0.5 * d.target.width,
                                            y: d.target.y - 0.5*(detailedViewNodeRectWidth-nodeRectWidth),
                                        }
                                    ]);
                                });
                    }
                    // Update the node rect width and stroke width
                    select(this).select(".node-rect")
                    .transition()
                    .duration(transitionDuration)
                        .attr("x", -0.5*nodeRectWidth-0.5*(detailedViewNodeRectWidth-nodeRectWidth))
                        .attr("y", -0.5*(detailedViewNodeRectWidth-nodeRectWidth))
                        .attr("width", detailedViewNodeRectWidth)
                        .attr("height", detailedViewNodeRectWidth)
                    .on("end", () => {
                        // Remove the summary view and render the detailed view after the transition
                        currNodeGroup.selectAll(".summary").remove();
                        _this.renderDetailedView(currNodeGroup);
                        // Re-render the exposed split histogram and flow links
                        if (_this.uniqueDecisionPaths.length !== 0) {
                            _this.update();
                        } else {
                            _this.update("reset");
                        }
                    });
                }
            }
        }

        // Create svg group binding decision and leaf nodes
        const node = parts.svgGroup.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", (d) => { 
                return "node" + 
                (d.children ? " node--internal" : " node--leaf"); 
            })
            .attr("id", (d) => d.data.name)
            .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
            .on("click", clicked);
        
        // Add a rectangle to each node
        node.append("rect")
            .attr("class", "node-rect")
            .attr("id", (d) => d.data.name)
            .attr("width", nodeRectWidth)
            .attr("height", (d) => d.data.type === "leaf" ? nodeRectWidth+2*nodeRectRatio : nodeRectWidth)
            .attr("x",- 0.5 * nodeRectWidth)
            .attr("y",0)
            .attr("rx", (d) => d.data.type === "leaf" ? leafNodeRectRatio : nodeRectRatio)
            .attr("ry", (d) => d.data.type === "leaf" ? leafNodeRectRatio : nodeRectRatio)
            .style("fill", "#fff")
            .style("stroke", "#000000")
            .style("stroke-width", (d) => d.data.type === "leaf" ? leafNodeRectStrokeWidth : nodeRectStrokeWidth);
        
        this.renderPathSummaryView(node);
        this.renderSummaryView(node);
    }

    /**
     * Render summary view in each decision node
     * @date 2022-06-17
     * @param {node} node
     */
    renderSummaryView(node) {
        const { constants: { nodeRectWidth, nodeRectRatio, featureArr, colorScale, featureColorScale } } = this;
        let _this = this;
        // Draw class distribution
        node.each(function(nodeData, index) {
            // Draw class distribution
            _this.drawClassDistribution(d3.select(this), nodeData, nodeRectWidth, nodeRectRatio, colorScale);
            if (nodeData.data.type === "decision") {
                if (nodeData.data.featureIdx.length === 2) {
                    // Draw feature coefficients distribution
                }
                // Draw feature coefficients distribution
                _this.drawCoefficientBar(d3.select(this), nodeData, nodeRectWidth, nodeRectRatio, featureArr, featureColorScale);
                // Draw split point distribution
                _this.drawSplitHistogram(d3.select(this), nodeData, nodeRectWidth, nodeRectRatio, colorScale);
            }
            
        })
    }

    /**
     * Draw class distribution in the summary view
     * @date 2022-07-01
     * @param {targetSelection} targetSelection
     * @param {nodeData} nodeData
     * @param {nodeRectWidth} nodeRectWidth
     * @param {nodeRectRatio} nodeRectRatio
     * @param {colorScale} colorScale
     */
    drawClassDistribution(targetSelection, nodeData, nodeRectWidth, nodeRectRatio, colorScale) {
        // Encode current decision node class distribution into the range of node rect width
        let xTotal = d3.scaleLinear()
            .domain([0, _.sum(nodeData.data.totalCount)])
            .range([0, nodeRectWidth-2*nodeRectRatio]);
        
        // Generate classData with data structure [{start: , end: , label: },...] to draw horizontal bar
        let currStart, currEnd = 0, nextStart = 0;
        const classData = [];
        nodeData.data.totalCount.forEach((ele, idx) => {
            currStart = nextStart;
            currEnd += ele;
            nextStart += ele;
            classData.push({
                start: currStart,
                end: currEnd,
                label: idx,
            });
        });

        // Create a svg group to bind each individual class rect
        let classDistribution = targetSelection.selectAll("g.class-distribution")
            .data(classData)
            .enter()
            .append("g")
            .attr("class", "summary class-distribution")
            .attr("transform", `translate(${nodeRectRatio}, ${nodeRectRatio})`);
        // Append each class rect into classDistribution svg group
        classDistribution.append("rect")
            .attr("class", "summary class-rect")
            .attr("width", (d) => xTotal(d.end-d.start))
            .attr("height", nodeRectRatio)
            .attr("x", (d) => - 0.5*(nodeRectWidth)+xTotal(d.start))
            .style("fill", (d) => colorScale[d.label])
            .style("stroke", "#000")
            .style("stroke-width", "2px");
    }

    /**
     * Draw feature coefficients distribution in the summary view
     * @date 2022-07-01
     * @param {targetSelection} targetSelection
     * @param {nodeData} nodeData
     * @param {nodeRectWidth} nodeRectWidth
     * @param {nodeRectRatio} nodeRectRatio
     * @param {featureArr} featureArr
     * @param {featureColorScale} featureColorScale
     */
    drawCoefficientDistribution(targetSelection, nodeData, nodeRectWidth, nodeRectRatio, featureArr, featureColorScale) {
        // Draw coefficient weights of features in the oblique split
        const {featureIdx, split }  = nodeData.data;
        const coefficientsNames = featureIdx.map(idx => featureArr[idx]);
        const coefficientWeights = normalizeArr(featureIdx.map(idx => split[idx]));
        const coefficientsData = coefficientWeights.map((val, idx) => ({
            name: coefficientsNames[idx],
            weight: val,
        }));
        const xCoefficient = d3.scaleBand()
            .range([0, 0.5*(nodeRectWidth-2*nodeRectRatio)])
            .domain(coefficientsNames)
            .padding(0.2),
        yCoefficient = d3.scaleLinear()
            .range([0.3*(nodeRectWidth-2*nodeRectRatio), 0])
            .domain([0, 1]);
        
        targetSelection.selectAll("rect.coefficients")
            .data(coefficientsData)
            .join("rect")
                .attr("class", "summary coefficients")
                .attr("x", d => xCoefficient(d.name)-0.25*(nodeRectWidth-2*nodeRectRatio))
                .attr("y", d => yCoefficient(d.weight)+0.2*(nodeRectWidth-2*nodeRectRatio))
                .attr("width", xCoefficient.bandwidth())
                .attr("height", d => 0.3*(nodeRectWidth-2*nodeRectRatio)-yCoefficient(d.weight))
                .attr("fill", d => featureColorScale(d.name))
                .style("stroke", "#000")
                .style("stroke-width", "2px");

        // Append x-axis for coefficients
        targetSelection.append("g")
            .attr("class", "summary coefficients x-axis")
            .attr("transform", `translate(${-0.25*(nodeRectWidth-2*nodeRectRatio)}, ${0.5*(nodeRectWidth-2*nodeRectRatio)})`)
            .call(d3.axisBottom(xCoefficient))
            .selectAll("text")
    }

    /**
     * Draw feature coefficients distribution in the summary view (horizontal bar)
     * @date 2022-07-05
     * @param {targetSelection} targetSelection
     * @param {nodeData} nodeData
     * @param {nodeRectWidth} nodeRectWidth
     * @param {nodeRectRatio} nodeRectRatio
     * @param {featureArr} featureArr
     * @param {featureColorScale} featureColorScale
     */
    drawCoefficientBar(targetSelection, nodeData, nodeRectWidth, nodeRectRatio, featureArr, featureColorScale) {
        // Draw coefficient weights of features in the oblique split
        const {featureIdx, split }  = nodeData.data;
        const coefficientsNames = featureIdx.map(idx => featureArr[idx]);
        const coefficientWeights = normalizeArr(featureIdx.map(idx => split[idx]));
        let currStart, currEnd = 0, nextStart = 0;
        const coefficientsData = [];
        coefficientWeights.forEach((ele, idx) => {
            currStart = nextStart;
            currEnd += ele;
            nextStart += ele;
            coefficientsData.push({
                start: currStart,
                end: currEnd,
                label: coefficientsNames[idx],
            });
        });
        const xBar = d3.scaleLinear()
            .domain([0, 1])
            .range([0, nodeRectWidth-4*nodeRectRatio]);
        // Create a svg group to bind each individual coefficient bar
        const coefficientDistribution = targetSelection.selectAll("g.coefficient-distribution")
            .data(coefficientsData)
            .enter()
            .append("g")
            .attr("class", "summary coefficient-distribution")
            .attr("transform", `translate(${2*nodeRectRatio}, ${2*nodeRectRatio})`);
        // Append each class rect into coefficientDistribution svg group
        coefficientDistribution.append("rect")
            .attr("class", "summary coefficients-bar")
            .attr("width", (d) => xBar(d.end)-xBar(d.start))
            .attr("height", 0.5*nodeRectRatio)
            .attr("rx", 0.25*nodeRectRatio)
            .attr("ry", 0.25*nodeRectRatio)
            .attr("x", (d) => - 0.5*(nodeRectWidth)+xBar(d.start))
            .attr("y", 0.25*(nodeRectWidth-2*nodeRectRatio)-0.5*nodeRectRatio)
            .style("fill", (d) => featureColorScale(d.label))
            .style("stroke", "#000")
            .style("stroke-width", "2px");
        
        // Append text above each bar
        coefficientDistribution.append("text")
            .attr("class", "summary coefficients-bar-text")
            .attr("x", (d) => - 0.5*(nodeRectWidth)+xBar(d.start)+0.5*(xBar(d.end)-xBar(d.start)))
            .attr("y", 0.25*(nodeRectWidth-2*nodeRectRatio)-0.75*nodeRectRatio)
            .attr("text-anchor", "middle")
            .text((d) => d.label);
    }

    /**
     * Draw split point distribution in the summary view
     * @date 2022-07-01
     * @param {targetSelection} targetSelection
     * @param {nodeData} nodeData
     * @param {nodeRectWidth} nodeRectWidth
     * @param {nodeRectRatio} nodeRectRatio
     * @param {colorScale} colorScale
     */
    drawSplitHistogram(targetSelection, nodeData, nodeRectWidth, nodeRectRatio, colorScale) {
        // Draw split histogram
        let xRight = d3.scaleLinear()
            .domain([0, _.sum(nodeData.data.totalCount)])
            .range([0, 0.5*(nodeRectWidth-2*nodeRectRatio)]),
            xLeft = d3.scaleLinear()
            .domain([_.sum(nodeData.data.totalCount), 0])
            .range([0, 0.5*(nodeRectWidth-2*nodeRectRatio)]),
            yBand = d3.scaleBand()
            .range([0, 0.5*(nodeRectWidth-2*nodeRectRatio)])
            .domain([0,1,2])
            .padding(.1);

        const splitData = nodeData.data.leftCount.map((val, idx) => [val, nodeData.data.rightCount[idx]]);
        const splitDistribution = targetSelection.selectAll("g.split-distribution")
            .data(splitData)
            .enter()
            .append("g")
            .attr("class", "summary split-distribution")
            .attr("transform", `translate(${nodeRectRatio},${nodeRectRatio})`);
        
        // Append left and right split distribution into splitDistribution svg group
        splitDistribution.append("rect")
            .attr("class", "summary split-rect")
            .attr("width", (d) => {
                return xRight(d[1]);
            })
            .attr("height", yBand.bandwidth())
            .attr("x", - nodeRectRatio)
            .attr("y", (d, i) => yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio))
            .attr("fill", (d, i) => colorScale[i])
            .style("stroke", "#000")
            .style("stroke-width", "2px");

        splitDistribution.append("rect")
            .attr("class", "summary split-rect")
            .attr("width", (d) => {
                return 0.5*(nodeRectWidth-2*nodeRectRatio)-xLeft(d[0]);
            })
            .attr("height", yBand.bandwidth())
            .attr("x", (d) => -0.5*nodeRectWidth+xLeft(d[0]))
            .attr("y", (d, i) => yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio))
            .attr("fill", (d, i) => colorScale[i])
            .style("stroke", "#000")
            .style("stroke-width", "2px");

        // Append left and right split distribution text into splitDistribution svg group
        splitDistribution.append("text")
            .attr("class", "summary split-text")
            .text( (d) => d[1])
            .attr("text-anchor", "start")
            .attr("font-size", "10px")
            .attr("fill", "black")
            .attr("transform", (d, i) => {
                return `translate(${-nodeRectRatio+xRight(d[1])+5},
                    ${5+0.5*yBand.bandwidth()+yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio)})`;
            })
        
        splitDistribution.append("text")
            .attr("class", "summary split-text")
            .text( (d) => d[0])
            .attr("text-anchor", "end")
            .attr("font-size", "10px")
            .attr("fill", "black")
            .attr("transform", (d, i) => {
                return `translate(${-0.5*nodeRectWidth+xLeft(d[0])-5},
                    ${5+0.5*yBand.bandwidth()+yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio)})`;
            })

        // Append centered axis
        splitDistribution.append("g")
            .attr("class", "summary center-axis")
            .attr("transform", `translate(${-nodeRectRatio},
                ${0.5*(nodeRectWidth-2*nodeRectRatio)})`)
            .call(d3.axisLeft(yBand).tickFormat(""));

        splitDistribution.append("g")
            .attr("class", "summary center-axis")
            .attr("transform", `translate(${-nodeRectRatio},
                ${0.5*(nodeRectWidth-2*nodeRectRatio)})`)
            .call(d3.axisRight(yBand).tickFormat(""));
    }

    /**
     * Draw highlighted split point distribution in the summary view during data points
     * selection in the projection view
     * @date 2022-07-08
     * @param {targetSelection} targetSelection
     * @param {originalNodeData} originalNodeData
     * @param {exposedNodeData} exposedNodeData
     * @param {nodeRectWidth} nodeRectWidth
     * @param {nodeRectRatio} nodeRectRatio
     * @param {colorScale} colorScale
     */
    drawExposedSplitHistogram(targetSelection, originalNodeData, exposedNodeData, nodeRectWidth, nodeRectRatio, colorScale) {
        // Draw split histogram
        let xRight = d3.scaleLinear()
            .domain([0, _.sum(originalNodeData.totalCount)])
            .range([0, 0.5*(nodeRectWidth-2*nodeRectRatio)]),
            xLeft = d3.scaleLinear()
            .domain([_.sum(originalNodeData.totalCount), 0])
            .range([0, 0.5*(nodeRectWidth-2*nodeRectRatio)]),
            yBand = d3.scaleBand()
            .range([0, 0.5*(nodeRectWidth-2*nodeRectRatio)])
            .domain([0,1,2])
            .padding(.1);

        let splitData = exposedNodeData.data.leftCount.map((val, idx) => [val, exposedNodeData.data.rightCount[idx]]);
        const splitDistribution = targetSelection.selectAll(`g.exposed-split-distribution#${originalNodeData.name}`)
            .data(splitData)
            .enter()
            .append("g")
            .attr("class", "summary exposed-split-distribution")
            .attr("transform", `translate(${nodeRectRatio},${nodeRectRatio})`);
        
        // Append left and right split distribution into splitDistribution svg group
        splitDistribution.append("rect")
            .attr("class", "summary exposed-split-rect")
            .attr("id", `${originalNodeData.name}`)
            .attr("width", (d) => {
                return xRight(d[1]);
            })
            .attr("height", yBand.bandwidth())
            .attr("x", - nodeRectRatio)
            .attr("y", (d, i) => yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio))
            .attr("fill", (d, i) => {
                const texture = textures.lines()
                    .size(8)
                    .strokeWidth(2)
                    .stroke("#000")
                    .background(colorScale[i]);
                splitDistribution.call(texture);
                return texture.url();
            })
            .style("stroke", "#000")
            .style("stroke-width", "2px");

        splitDistribution.append("rect")
            .attr("class", "summary exposed-split-rect")
            .attr("id", `${originalNodeData.name}`)
            .attr("width", (d) => {
                return 0.5*(nodeRectWidth-2*nodeRectRatio)-xLeft(d[0]);
            })
            .attr("height", yBand.bandwidth())
            .attr("x", (d) => -0.5*nodeRectWidth+xLeft(d[0]))
            .attr("y", (d, i) => yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio))
            .attr("fill", (d, i) => {
                const texture = textures.lines()
                    .size(8)
                    .strokeWidth(2)
                    .stroke("#000")
                    .background(colorScale[i]);
                splitDistribution.call(texture);
                return texture.url();
            })
            .style("stroke", "#000")
            .style("stroke-width", "2px");

    }

    /**
     * Render detailed view in each decision node
     * @date 2022-06-16
     * @param {node} node
     */
    renderDetailedView(node) {
        const { constants: { nodeRectWidth, histogramHeight, detailedViewNodeRectWidth, scatterPlotPadding, histogramScatterPlotPadding, colorScale, featureArr, featureColorScale } } = this;
        let _this = this;
        // Map two feature variables into visual representations
        const x = featureArr.map(f => d3.scaleLinear()
            .domain(d3.extent(this.trainX, d => d[f]))
            .range([0, detailedViewNodeRectWidth-histogramHeight-3*scatterPlotPadding-histogramScatterPlotPadding]));

        const y = x.map(x => x.copy()
            .range([detailedViewNodeRectWidth-histogramHeight-3*scatterPlotPadding-histogramScatterPlotPadding, 0]));

        // Add dots in each decision node
        node.each(function (nodeData, index) {
            let currFeatureIdx = nodeData.data.featureIdx;
            if (currFeatureIdx.length === 2) {
                // Draw two-feature scatter plot
                _this.drawScatterPlot(node, nodeData, nodeRectWidth, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, featureArr, colorScale, currFeatureIdx, _this, x, y);
                // Draw two-feature histogram
                _this.drawFeatureHistogram(node, nodeData, nodeRectWidth, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, featureArr, featureColorScale, currFeatureIdx, _this, x, y);
            }

            if (currFeatureIdx.length === 1) {
                // Draw strip chart for one-feature classifier
                _this.drawStripChart(node, nodeData, nodeRectWidth, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, featureArr, featureColorScale, currFeatureIdx, _this);
            }
        })
    }

    /**
     * Draw two-feature scatter plot in each decision node
     * @date 2022-07-01
     * @param {targetSelection} targetSelection
     * @param {nodeData} nodeData
     * @param {nodeRectWidth} nodeRectWidth
     * @param {scatterPlotPadding} scatterPlotPadding
     * @param {featureArr} featureArr
     * @param {colorScale} colorScale
     * @param {currFeatureIdx} currFeatureIdx
     * @param {that} that
     * @param {x} x
     * @param {y} y
     */
    drawScatterPlot(targetSelection, nodeData, nodeRectWidth, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, featureArr, colorScale, currFeatureIdx, that, x, y) {
        // Allow X and Y axis generators to be called
        targetSelection.append("g")
            .attr("class", "detailed x-axis")
            .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
                ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+detailedViewNodeRectWidth-2*scatterPlotPadding})`)
            .call(d3.axisBottom(x[currFeatureIdx[0]]));
        targetSelection.append("g")
            .attr("class", "detailed y-axis")
            .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
                ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding})`)
            .call(d3.axisLeft(y[currFeatureIdx[1]]));
        
        const endPoints = getEndSplitPoint(currFeatureIdx, nodeData, that);
        const lineHelper = d3.line().x(d => x[currFeatureIdx[0]](d.x)).y(d => y[currFeatureIdx[1]](d.y));

        targetSelection.append("path")
            .datum(endPoints)
                .attr("class", "detailed split-line")
                .attr("d", (d) => lineHelper(d))
                .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
                    ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding})`)
                .style('fill', 'none')
                .style('stroke', 'black')
                .style('stroke-width', '2px');

        targetSelection.selectAll("circle")
            .data(nodeData.data.subTrainingSet)
            .enter()
            .append("circle")
                .attr("class", "detailed dot")
                .attr("id", d => `dot-${d}`)
                .attr("cx", (d) => {
                    return x[currFeatureIdx[0]](that.trainX[d][featureArr[currFeatureIdx[0]]])
                        -0.5*detailedViewNodeRectWidth+2*scatterPlotPadding;
                })
                .attr("cy", (d) => {
                    return y[currFeatureIdx[1]](that.trainX[d][featureArr[currFeatureIdx[1]]])
                        -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding;
                })
                .attr("r", 3.5)
                .style("fill", (d) => {
                    if (that.selectedPoints.length && !that.selectedPoints.includes(d)) {
                        return "#fff";
                    } else {
                        return colorScale[that.trainY[d]];
                    }
                })
                .style("stroke", (d) => colorScale[that.trainY[d]]);
    }

    /**
     * Draw strip chart for one-feature classifier decision node
     * @date 2022-07-03
     * @param {targetSelection} targetSelection
     * @param {nodeData} nodeData
     * @param {nodeRectWidth} nodeRectWidth
     * @param {detailedViewNodeRectWidth} detailedViewNodeRectWidth
     * @param {scatterPlotPadding} scatterPlotPadding
     * @param {featureArr} featureArr
     * @param {currFeatureIdx} currFeatureIdx
     * @param {that} that
     */
    drawStripChart(targetSelection, nodeData, nodeRectWidth, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, featureArr, featureColorScale, currFeatureIdx, that) {
        // Generate data for strip chart
        const stripData = nodeData.data.subTrainingSet.map((idx) => 
            ({
                id: idx,
                label: that.trainY[idx],
                value: that.trainX[idx][featureArr[currFeatureIdx[0]]]
            })
        );

        // Get split point value
        const splitPoint = nodeData.data.split[nodeData.data.split.length-1];

        // Create value encoding for x and y axis
        const xStrip = d3.scaleLinear()
            .domain(d3.extent(stripData, d => d.value))
            .range([0, detailedViewNodeRectWidth-3*scatterPlotPadding]);
        const yStrip = d3.scalePoint()
            .domain([0,1,2])
            .rangeRound([detailedViewNodeRectWidth-3*scatterPlotPadding-histogramHeight-histogramScatterPlotPadding, 0])
            .padding(1);

        // Draw strip chart axes
        targetSelection.append("g")
            .attr("class", "detailed strip-chart x-axis")
            .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding},
                ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+detailedViewNodeRectWidth-2*scatterPlotPadding})`)
            .call(d3.axisBottom(xStrip));
        targetSelection.append("g")
            .attr("class", "detailed strip-chart y-axis")
            .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding},
                ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding})`)
            .call(d3.axisLeft(yStrip));
        
        // Draw points for strip chart
        targetSelection.append("g")
            .attr("class", "detailed strip-chart-group")
            .attr("pointer-events", "all")
        .selectAll("circle")
        .data(stripData)
        .join("circle")
            .attr("r", 3.5)
            .attr("cx", d => xStrip(d.value)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding)
            .attr("cy", d => yStrip(d.label)-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding)
            .attr("fill", d => d.value < splitPoint ? "red" : "blue");
        
        // Append split point line for strip chart
        targetSelection.append("line")
            .attr("class", "detailed strip-cahrt split-line")
            .attr("x1", xStrip(splitPoint)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding)
            .attr("y1", -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+detailedViewNodeRectWidth-2*scatterPlotPadding)
            .attr("x2", xStrip(splitPoint)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding)
            .attr("y2", -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding)
            .style("stroke", "#000")
            .style("stroke-width", "3px");
        
        // Draw feature histogram for strip chart
        // Set up histogram parameters
        const stripHistogram = d3.bin()
            .value((d) => d.value)
            .domain(xStrip.domain())
            .thresholds(xStrip.ticks(20));

        // Get the original data for histograms
        const valuesLeft = nodeData.data.leftSubTrainingSet.map(idx => ({
            value: that.trainX[idx][featureArr[currFeatureIdx[0]]],
            label: that.trainY[idx],
        })),
            valuesRight = nodeData.data.rightSubTrainingSet.map(idx => ({
                value: that.trainX[idx][featureArr[currFeatureIdx[0]]],
                label: that.trainY[idx],
            }));

        // Get the histogram data according to predefined histogram functions
        const binsLeft = stripHistogram(valuesLeft),
            binsRight = stripHistogram(valuesRight);

        // Set up y-axis value encodings for histograms
        const yHistogram = d3.scaleLinear()
            .domain([0, Math.max(d3.max(binsLeft, d => d.length), d3.max(binsRight, d => d.length))])
            .range([histogramHeight, 0]);
        
        // Draw histograms
        targetSelection.selectAll("rect.histogram.x-histogram.left")
            .data(binsLeft)
            .join("rect")
            .attr("class", "detailed histogram")
            .attr("transform", d => `translate(${xStrip(d.x0)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
                ${yHistogram(d.length)-histogramHeight+scatterPlotPadding})`)
            .attr("width", d => xStrip(d.x1)-xStrip(d.x0))
            .attr("height", d => histogramHeight-yHistogram(d.length))
            .attr("fill", featureColorScale(featureArr[currFeatureIdx[0]]))
            .style("opacity", 0.4);

        targetSelection.selectAll("rect.histogram.x-histogram.right")
            .data(binsRight)
            .join("rect")
            .attr("class", "detailed histogram")
            .attr("transform", d => `translate(${xStrip(d.x0)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
                ${yHistogram(d.length)-histogramHeight+scatterPlotPadding})`)
                .attr("width", d => xStrip(d.x1)-xStrip(d.x0))
                .attr("height", d => histogramHeight-yHistogram(d.length))
            .attr("fill", featureColorScale(featureArr[currFeatureIdx[0]]))
            .style("opacity", 0.6);
        
        // Draw x-axis for histogram
        targetSelection.append("g")
            .attr("class", "detailed histogram x-axis")
            .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding},
                ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding})`)
            .call(d3.axisBottom(xStrip).tickFormat(""));
    }

    /**
     * Draw feature distribution in detailed view
     * @date 2022-07-01
     * @param {targetSelection} targetSelection
     * @param {nodeData} nodeData
     * @param {nodeRectWidth} nodeRectWidth
     * @param {detailedViewNodeRectWidth} detailedViewNodeRectWidth
     * @param {scatterPlotPadding} scatterPlotPadding
     * @param {featureArr} featureArr
     * @param {featureColorScale} featureColorScale
     * @param {currFeatureIdx} currFeatureIdx
     * @param {that} that
     * @param {x} x
     * @param {y} y
     */    
    drawFeatureHistogram(targetSelection, nodeData, nodeRectWidth, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, featureArr, featureColorScale, currFeatureIdx, that, x, y) {
        // Set the parameters for histograms
        const histogram1 = d3.bin()
            .value((d) => d.value)
            .domain(x[currFeatureIdx[0]].domain())
            .thresholds(x[currFeatureIdx[0]].ticks(20)),
            histogram2 = d3.bin()
                .value((d) => d.value)
                .domain(y[currFeatureIdx[1]].domain())
                .thresholds(y[currFeatureIdx[1]].ticks(20));

        // Get the original data for histograms
        const values1Left = nodeData.data.leftSubTrainingSet.map(idx => ({
            value: that.trainX[idx][featureArr[currFeatureIdx[0]]],
            label: that.trainY[idx],
        })),
            values1Right = nodeData.data.rightSubTrainingSet.map(idx => ({
                value: that.trainX[idx][featureArr[currFeatureIdx[0]]],
                label: that.trainY[idx],
            })),
            values2Left = nodeData.data.leftSubTrainingSet.map(idx => ({
                value: that.trainX[idx][featureArr[currFeatureIdx[1]]],
                label: that.trainY[idx],
            })),
            values2Right = nodeData.data.rightSubTrainingSet.map(idx => ({
                value: that.trainX[idx][featureArr[currFeatureIdx[1]]],
                label: that.trainY[idx],
            }));
        // Get the histogram data according to predefined histogram functions
        const bins1Left = histogram1(values1Left),
            bins1Right = histogram1(values1Right),
            bins2Left = histogram2(values2Left),
            bins2Right = histogram2(values2Right);

        // Set up y-axis value encodings for histograms
        const yHistogram1 = d3.scaleLinear()
                .domain([0, Math.max(d3.max(bins1Left, d => d.length), d3.max(bins1Right, d => d.length))])
                .range([histogramHeight, 0]),
            yHistogram2 = d3.scaleLinear()
                .domain([0, Math.max(d3.max(bins2Left, d => d.length), d3.max(bins2Right, d => d.length))])
                .range([0, histogramHeight]);
        // Draw histograms
        targetSelection.selectAll("rect.histogram.x-histogram.left")
            .data(bins1Left)
            .join("rect")
            .attr("class", "detailed histogram")
            .attr("transform", d => `translate(${x[currFeatureIdx[0]](d.x0)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
                ${yHistogram1(d.length)-histogramHeight+scatterPlotPadding})`)
            .attr("width", d => x[currFeatureIdx[0]](d.x1)-x[currFeatureIdx[0]](d.x0))
            .attr("height", d => histogramHeight-yHistogram1(d.length))
            .attr("fill", featureColorScale(featureArr[currFeatureIdx[0]]))
            .style("opacity", 0.4);

        targetSelection.selectAll("rect.histogram.x-histogram.right")
            .data(bins1Right)
            .join("rect")
            .attr("class", "detailed histogram")
            .attr("transform", d => `translate(${x[currFeatureIdx[0]](d.x0)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
                ${yHistogram1(d.length)-histogramHeight+scatterPlotPadding})`)
                .attr("width", d => x[currFeatureIdx[0]](d.x1)-x[currFeatureIdx[0]](d.x0))
                .attr("height", d => histogramHeight-yHistogram1(d.length))
            .attr("fill", featureColorScale(featureArr[currFeatureIdx[0]]))
            .style("opacity", 0.6);

        // Draw axis for histogram on the first feature
        targetSelection.append("g")
            .attr("class", "detailed histogram axis-left")
            .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding},
                ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding})`)
            .call(d3.axisBottom(x[currFeatureIdx[0]]).tickFormat(""));

        targetSelection.selectAll("rect.histogram.y-histogram.left")
            .data(bins2Left)
            .join("rect")
            .attr("class", "detailed histogram")
            .attr("y", -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+histogramScatterPlotPadding)
            .attr("transform", d => `translate(${0.5*detailedViewNodeRectWidth-scatterPlotPadding-histogramHeight}, 
                ${x[currFeatureIdx[1]](d.x0)+scatterPlotPadding})`)
            .attr("width", (d) => yHistogram2(d.length))
            .attr("height", d => x[currFeatureIdx[1]](d.x1)-x[currFeatureIdx[1]](d.x0))
            .attr("fill", featureColorScale(featureArr[currFeatureIdx[1]]))
            .style("opacity", 0.4);

        targetSelection.selectAll("rect.histogram.y-histogram.right")
            .data(bins2Right)
            .join("rect")
            .attr("class", "detailed histogram")
            .attr("y", -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+histogramScatterPlotPadding)
            .attr("transform", d => `translate(${0.5*detailedViewNodeRectWidth-scatterPlotPadding-histogramHeight}, 
                ${x[currFeatureIdx[1]](d.x0)+scatterPlotPadding})`)
            .attr("width", d => yHistogram2(d.length))
            .attr("height", d => x[currFeatureIdx[1]](d.x1)-x[currFeatureIdx[1]](d.x0))
            .attr("fill", featureColorScale(featureArr[currFeatureIdx[1]]))
            .style("opacity", 0.6);

        // Draw axis for histogram on the second feature
        targetSelection.append("g")
            .attr("class", "detailed histogram axis-right")
            .attr("transform", `translate(${0.5*detailedViewNodeRectWidth-scatterPlotPadding-histogramHeight},
                ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding})`)
            .call(d3.axisLeft(x[currFeatureIdx[1]]).tickFormat(""));
    }

    /**
     * Render path summary view, including feature contributions
     * @date 2022-06-17
     * @param {node} node
     */
    renderPathSummaryView(node) {
        const { constants: { nodeRectWidth, nodeRectRatio, leafNodeRectStrokeWidth, transitionDuration, colorScale } } = this;
        let _this = this;

        // Draw histogram for feature contribution
        node.each(function (nodeData, index) {
            if (nodeData.data.type === "leaf") {
                d3.select(this).attr("clip-path", "url(#scrollbox-clip-path)");
                // Get node rect bbox
                const currLeafNode = d3.select(this).select("rect.node-rect");
                const leafNodeBBox = {
                    x: parseFloat(currLeafNode.attr("x")),
                    y: parseFloat(currLeafNode.attr("y")),
                    width: parseFloat(currLeafNode.attr("width")),
                    height: parseFloat(currLeafNode.attr("height")),
                };

                const scrollBarWidth = leafNodeRectStrokeWidth;
                let scrollDistance = 0;

                // Add a clip path and a rect within it.
                // Everything inside the scroll group that does not overlap this 
                // rectangle will be hidden
                const clipRect = d3.select(this).append("clipPath")
                    .attr("id", "scrollbox-clip-path")
                    .append("rect");
                
                clipRect
                    .attr("x", leafNodeBBox.x) // -nodeRectStrokeWidth to account for stroke
                    .attr("y", leafNodeBBox.y)
                    .attr("width", leafNodeBBox.width)
                    .attr("height", leafNodeBBox.height);
                
                // Insert an invisible rect that will be used to capture scroll events
                d3.select(this).insert("rect", "g")
                    .attr("class", "scroll-capture-rect")
                    .attr("x", leafNodeBBox.x)
                    .attr("y", leafNodeBBox.y)
                    .attr("width", leafNodeBBox.width)
                    .attr("height", leafNodeBBox.height)
                    .style("opacity", 0);
                
                // Position the scroll indicator
                const scrollBar = d3.select(this).append("rect")
                    .attr("width", scrollBarWidth)
                    .attr("rx", scrollBarWidth/2)
                    .attr("ry", scrollBarWidth/2)
                    .style("fill", "#d6dee1")
                    .attr("transform", `translate(${-scrollBarWidth+0.5*leafNodeBBox.width-0.5*leafNodeRectStrokeWidth}, 
                        ${leafNodeBBox.y+0.5*leafNodeRectStrokeWidth})`)
                    .on("mouseover", function () {
                        d3.select(this)
                            .transition()
                            .duration(transitionDuration/3)
                            .attr("transform", `translate(${-(scrollBarWidth+2)+0.5*leafNodeBBox.width-0.5*leafNodeRectStrokeWidth}, 
                                ${leafNodeBBox.y+0.5*leafNodeRectStrokeWidth})`)
                            .attr("width", scrollBarWidth+2)
                            .attr("rx", (scrollBarWidth+2)/2)
                            .attr("ry", (scrollBarWidth+2)/2)
                            .style("fill", "#a8bbbf");
                    })
                    .on("mouseout", function () {
                        d3.select(this)
                            .transition()
                            .duration(transitionDuration/3)
                            .attr("transform", `translate(${-scrollBarWidth+0.5*leafNodeBBox.width-0.5*leafNodeRectStrokeWidth}, 
                                ${leafNodeBBox.y+0.5*leafNodeRectStrokeWidth})`)
                            .attr("width", scrollBarWidth)
                            .attr("rx", scrollBarWidth/2)
                            .attr("ry", scrollBarWidth/2)
                            .style("fill", "#d6dee1");
                    })

                // Get valid feature contribution data for this node
                const { fcArr, fcRange } = getEffectiveFeatureContribution(nodeData, _this);
                
                // Create value encoding for x and y axis
                let x = d3.scaleLinear()
                    .domain(fcRange)
                    .range([0, nodeRectWidth-4*nodeRectRatio]),
                    yBand = d3.scaleBand()
                    .range([0, (1/2)*(nodeRectWidth-2*nodeRectRatio)-0.5*nodeRectRatio])
                    .domain([0,1,2])
                    .padding(.2);
                
                // Iterate through the feature contribution arrays and draw them one by one
                fcArr.forEach((fc, idx) => {
                    // Draw feature contribution histogram
                    d3.select(this).selectAll("g")
                        .data(fc.featureContribution)
                        .enter()
                        .append("rect")
                            .attr("class", "path-summary feature-contribution-rect")
                            .attr("x", (d) => x(Math.min(0, d.value)) - x(0))
                            .attr('rx', 2)
                            .attr("y", (d) => 3*nodeRectRatio
                                 +yBand(d.label)+idx*(1/2)*(nodeRectWidth-2*nodeRectRatio))
                            .attr("width", (d) => Math.abs(x(d.value) - x(0)))
                            .attr("height", yBand.bandwidth())
                            .style("fill", (d) => {
                                const texture = textures.lines().thicker().stroke(colorScale[d.label]);
                                d3.select(this).call(texture);
                                return d.value > 0 ? colorScale[d.label] : texture.url();
                            })
                            .style("stroke", "#000")
                            .style("stroke-width", "2px");

                    // Add line to separeate each feature contribution
                    d3.select(this).append("line")
                        .attr("class", "path-summary feature-contribution-line")
                        .style("stroke", "#005CAB")
                        .style("stroke-width", 2)
                        .style("stroke-dasharray", ("3, 3"))
                        .attr("x1", -0.5*(nodeRectWidth-2*nodeRectRatio))
                        .attr("y1", 3*nodeRectRatio+idx*(1/2)*(nodeRectWidth-2*nodeRectRatio)-5)
                        .attr("x2", +0.5*(nodeRectWidth-2*nodeRectRatio))
                        .attr("y2", 3*nodeRectRatio+idx*(1/2)*(nodeRectWidth-2*nodeRectRatio)-5);

                    // Add text to show feature contribution name
                    d3.select(this).append("text")
                        .attr("class", "path-summary feature-contribution-text")
                        .attr("x", -0.5*(nodeRectWidth-2*nodeRectRatio))
                        .attr("y", 3*nodeRectRatio+idx*(1/2)*(nodeRectWidth-2*nodeRectRatio)+yBand.bandwidth()*2)
                        .text(fc.featureName);
                    if (idx === fcArr.length-1) {
                        d3.select(this).append("line")
                            .attr("class", "path-summary feature-contribution-line")
                            .style("stroke", "#005CAB")
                            .style("stroke-width", 2)
                            .style("stroke-dasharray", ("3, 3"))
                            .attr("x1", -0.5*(nodeRectWidth-2*nodeRectRatio))
                            .attr("y1", 3*nodeRectRatio+(idx+1)*(1/2)*(nodeRectWidth-2*nodeRectRatio)-5)
                            .attr("x2", +0.5*(nodeRectWidth-2*nodeRectRatio))
                            .attr("y2", 3*nodeRectRatio+(idx+1)*(1/2)*(nodeRectWidth-2*nodeRectRatio)-5);
                    }
                });
                // Calculate maximum scrollable amount
                const contentBBox = d3.select(this).node().getBBox();
                const absoluteContentHeight = contentBBox.y + contentBBox.height;
                const scrollBarHeight = (leafNodeBBox.height-leafNodeRectStrokeWidth) * leafNodeBBox.height / absoluteContentHeight;
                scrollBar.attr("height", scrollBarHeight);

                const maxScroll = Math.max(absoluteContentHeight - leafNodeBBox.height, 0);
                // Add scroll event listener
                const updateScrollPosition = (diff) => {
                    if (diff === 0) return;
                    scrollDistance += diff;
                    scrollDistance = Math.max(0, scrollDistance);
                    scrollDistance = Math.min(maxScroll, scrollDistance);
                    d3.select(this).selectAll("rect.summary")
                        .attr("transform", 
                        `translate(${leafNodeBBox.x+0.5*leafNodeBBox.width},
                            ${leafNodeBBox.y-scrollDistance})`);
                    d3.select(this).selectAll(".path-summary")
                        .attr("transform", 
                        `translate(${leafNodeBBox.x+0.5*leafNodeBBox.width},
                            ${leafNodeBBox.y-scrollDistance})`);
                    const scrollBarPosition = scrollDistance / maxScroll * ((leafNodeBBox.height-leafNodeRectStrokeWidth) - scrollBarHeight); 
                    scrollBar.attr("y", scrollBarPosition);
                }
                // Set up scroll events
                d3.select(this).on("wheel", (e,data) => {
                    updateScrollPosition(e.deltaY);
                });

                // Set up scrollbar drag events
                const dragBehaviour = d3.drag()
                    .on("drag", (e, data) => {
                        updateScrollPosition(e.dy * maxScroll / (leafNodeBBox.height - scrollBarHeight))
                    });
                // Add drag behaviour to scrollbar
                scrollBar.call(dragBehaviour);
            }
        });
    }

    /**
     * Update the oblique tree visualization according to selected data points
     * @date 2020-06-30
     * @param {any} selectedNodes
     * @returns {any} 
     */ 
    renderSelectionEffect(selectedDataPoints) {
        const { nodes, constants: { colorScale } } = this;
        this.selectedPoints = selectedDataPoints.map(selectedDataPoint => selectedDataPoint.id);
        const decisionPaths = selectedDataPoints.map((selectedDataPoint) => ({
            label: selectedDataPoint.label,
            path: new Array(),
            id: selectedDataPoint.id
        }));
        const traverse = (res, currNode, selectedPoint, idx) => {
            if (currNode.data.subTrainingSet.includes(selectedPoint.id)) {
                res[idx].path.push(currNode.data.name);
                currNode.children?.forEach((child) => {
                    traverse(res, child, selectedPoint, idx);
                });
            }
        };
        selectedDataPoints.forEach((selectedDataPoint, index) => {
            traverse(decisionPaths, nodes, selectedDataPoint, index);
        });
        let dict = {}, res = [];
        decisionPaths.forEach((decisionPath) => {
            let hash = decisionPath.label+JSON.stringify(decisionPath.path);
            if (!dict[hash]) {
                dict[hash] = {
                    label: decisionPath.label,
                    path: decisionPath.path,
                    idArr: [decisionPath.id]
                };
                res.push(dict[hash]);
            } else {
                dict[hash].idArr.push(decisionPath.id);
            }
        });
        // Assign unique decision path to this
        this.uniqueDecisionPaths = res.map(obj => ({...obj}));
        
        // Store exposed flow links in this
        let i, j, k;
        let flowLinks = [], currNodeSubTrainingSet, tmpLinkDict = {};
        this.uniqueDecisionPaths.forEach((decisionPath) => {
            k = decisionPath.path.length;
            i = 0, j = 1;
            while (j < k) {
                tmpLinkDict = {};
                currNodeSubTrainingSet = d3.select(`rect#${decisionPath.path[i]}`).data()[0].data.subTrainingSet;
                tmpLinkDict.pathId = `${decisionPath.path[i]}-${decisionPath.path[j]}-${decisionPath.label}`;
                tmpLinkDict.count = 0;
                decisionPath.idArr.forEach((id) => {
                    if (currNodeSubTrainingSet.includes(id)) {
                        tmpLinkDict.count++;
                    }
                });
                flowLinks.push(tmpLinkDict);
                i += 1;
                j += 1;
            }
        });
        this.exposedFlowLinks = flowLinks.map(link => ({...link}));
    }


    /**
     * Zooming is performed by either double clickiing on an empty part
     * of the SVG or by scrolling the mouse-wheel.
     * @date 2022-06-14
     */
    enableZooming() {
        const { parts, width, height } = this;
        const zoomed = ({ transform }) => {
            parts.svgGroup.attr('transform', transform);
        }

        const zoomListener = d3.zoom()
            .extent([[0,0], [width, height]])
            .scaleExtent([1, 8])
            .on('zoom', zoomed);
        parts.baseSvg.call(zoomListener);
    }

    /**
     * Set preprocessed data and options.
     * @date 2022-06-14
     * @param {opts} opts
     * @param {data} data
     */
    setDataAndOpts(opts, data, trainingData) {
        this.opts = opts;
        this.data = data;
        this.trainX = trainingData.trainingSet;
        this.trainY = trainingData.labelSet;
    }

    /**
     * Return an array of processed link object with structure
     * {"source": {x: , y: , width: }, "target": {x: , y: , width: }, class: }
     * @date 2022-06-15
     * @param {links} links
     */
    generateFlows(links) {
        const { constants: { nodeRectWidth, nodeRectRatio } } = this;

        // Width of flow should not be larger than (node rect width - 2 * node rect ratio)
        const widthFlow = nodeRectWidth - 2 * nodeRectRatio;
        let currSize, currWidth;
        const fullsize = _.sum(links[0].parent.data.totalCount);
        const resFlows = [];
        let currParentX, currChildX;
        // Loop through each link and generate flow
        for (const link of links) {
            currSize = _.sum(link.data.totalCount);
            currWidth = (currSize / fullsize) * widthFlow;
            const currLinkWidthArr = [];
            const currParentCountArr = link.parent.data.leftCount.concat(link.parent.data.rightCount);
            // Loop through left and right count of parent node
            currParentCountArr.forEach((ele, idx) => {
                currLinkWidthArr.push({
                    label: idx > 2 ? idx - 3 : idx,
                    value: (ele / currSize) * currWidth,
                    count: ele
                });
            });
            currParentX = link.parent.x;
            currChildX = link.x;
            // Generate flow for each link
            currLinkWidthArr.forEach((val, idx) => {
                // Update x position of parent and child node
                currParentX += idx > 0
                    ? 0.5 * (currLinkWidthArr[idx-1].value + currLinkWidthArr[idx].value) 
                    : - 0.5 * (_.sum(currLinkWidthArr.map(ele => ele.value)) - currLinkWidthArr[idx].value);
                currChildX += idx > 0 
                    ? 0.5 * (currLinkWidthArr[idx-1].value + currLinkWidthArr[idx].value) 
                    : - 0.5 * (currWidth - currLinkWidthArr[idx].value);
                let emptySpace = 0;
                // Calculate invalid movement for each child node on x axis
                for (let i = 0; i <= idx; i++) {
                    if (link.data.totalCount[currLinkWidthArr[i].label] !== currParentCountArr[i]) {
                        emptySpace += currLinkWidthArr[i].value;
                    }
                }
                // Store valid flow into resFlows to be rendered
                if (link.data.totalCount[val.label] === currParentCountArr[idx] && currLinkWidthArr[idx].count > 0) {
                    resFlows.push({
                        source: {
                            x: currParentX,
                            y: link.parent.y + nodeRectWidth,
                            width: currLinkWidthArr[idx].value,
                        },
                        target: {
                            x: currChildX - emptySpace,
                            y: link.y,
                            width: currLinkWidthArr[idx].value,
                        },
                        class: val.label,
                        id: `${link.parent.data.name}-${link.data.name}-${val.label}`,
                        count: currLinkWidthArr[idx].count
                    })
                }
            })
        }
        return resFlows;
    }
}

/**
 * Return information about the size of the whole Oblique Decision Tree (Odt)
 * and its position relative to the viewport. 
 * @date 2022-06-14
 * @param {node} node
 */
const adjustedClientRect = (node) => {
    const curr = _.pick(node.getBoundingClientRect(), ['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left']);
    curr.top += window.scrollY;
    curr.bottom += window.scrollY;
    curr.y += window.scrollY;
    curr.left += window.scrollX;
    curr.right += window.scrollX;
    curr.x += window.scrollX;
    // TODO: define inner svg width and height according to returned DOMRect size
    curr.width *= 1.5;
    curr.height *= 2.5;
    return curr;
};

/**
 * Return two end points on current split
 * @date 2022-06-21
 * @param {featureIdxArr} featureIdxArr
 * @param {currNode} currNode
 * @param {that} that
 */
const getEndSplitPoint = (featureIdxArr, currNode, that) => {
    const sv = currNode.data.split;
    const getSplitY = (x) => (sv[featureIdxArr[0]] * x + sv[sv.length-1]) / (- sv[featureIdxArr[1]]);
    const getSplitX = (y) => (sv[featureIdxArr[1]] * y + sv[sv.length-1]) / (- sv[featureIdxArr[0]]);
    const rangeX = d3.extent(that.trainX, d => d[that.constants.featureArr[featureIdxArr[0]]]);
    const rangeY = d3.extent(that.trainX, d => d[that.constants.featureArr[featureIdxArr[1]]]);
    const endPointsPair = [];
    let tmpMaxX = rangeX[1],
        tmpMaxY = rangeY[1],
        tmpMinX = rangeX[0],
        tmpMinY = rangeY[0];
    if (getSplitY(tmpMaxX) > tmpMaxY || getSplitY(tmpMaxX) < tmpMinY) {
        tmpMaxX = Math.max(getSplitX(tmpMaxY), getSplitX(tmpMinY));
    }
    if (getSplitY(tmpMinX) < tmpMinY || getSplitY(tmpMinX) > tmpMaxY) {
        tmpMinX = Math.min(getSplitX(tmpMaxY), getSplitX(tmpMinY));
    }

    if (getSplitX(tmpMaxY) > tmpMaxX || getSplitX(tmpMaxY) < tmpMinX) {
        tmpMaxY = Math.max(getSplitY(tmpMaxX), getSplitY(tmpMinX));
    }

    if (getSplitX(tmpMinY) < tmpMinX || getSplitX(tmpMinY) > tmpMaxX) {
        tmpMinY = Math.min(getSplitY(tmpMaxX), getSplitY(tmpMinX));
    }
    endPointsPair.push({
        x: tmpMaxX,
        y: tmpMaxY,
    });
    endPointsPair.push({
        x: tmpMinX,
        y: tmpMinY,
    });
    return endPointsPair;
}

/**
 * Return effective feature contribution array with index and array of values
 * @date 2022-06-22
 * @param {currNode} currNode
 * @param {that} that
 */
const getEffectiveFeatureContribution = (currNode, that) => {
    const effectiveFeatureArr = [];
    let range;
    let currRange;
    currNode.data.featureContribution.forEach((val, i) => {
        currRange = d3.extent(val);
        if (i === 0) range = currRange.slice();
        else {
            range[0] = Math.min(range[0], currRange[0]);
            range[1] = Math.max(range[1], currRange[1]);
        };
        if (!val.every(element => element === 0)) {
            const featureContributionArr = val.map((ele, idx) => {
                return {
                    label: idx,
                    value: ele
                };
            });
            effectiveFeatureArr.push({
                featureName: that.constants.featureArr[i],
                featureContribution: featureContributionArr,
            });
        }
    });

    return {
        fcArr: effectiveFeatureArr, 
        fcRange: range
    };
}

/**
 * Traverse the n-ary tree and update the position of each node
 * @date 2022-06-25
 * @param {node} node
 */
const traverseTree = (node) => {
    if (!node) return;
    // Move tree diagram to let by 500
    node.x -= 320;

    // TODO: Filter effective feature contribution in leaf nodes

    if (node.children && node.children.length > 0) {
        node.children.map(child => traverseTree(child));
    }
}

/**
 * Return normalized array of values
 * @date 2022-06-29
 * @param {any} count
 * @returns {any}
 */
const normalizeArr = (count) => {
    const absCount = count.map(element => Math.abs(element));
    const n = _.sum(absCount);
    return absCount.map(element => element / n);
};

/**
 * KDE estimates the probability distribution of a random variable.
 * The kernel's bandwidth determines the estimates' smoothness.
 * @date 2022-06-30
 * @param {any} kernel
 * @param {any} X
 * @returns {any}
 */
const kernelDensityEstimator = (kernel, X) => {
    return (V) => {
        return X.map((x) => {
            return [x, d3.mean(V, (v) => kernel(x - v))];
        })
    }
};

/**
 * An Epanechnikov Kernel is a kernel function that is of quadratic form.
 * @date 2022-06-30
 * @param {any} k
 * @returns {any}
 */
const kernelEpanechnikov = (k) => {
    return (v) => {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    }
} 

Odt.initClass();
export default Odt;