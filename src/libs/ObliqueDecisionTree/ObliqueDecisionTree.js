import * as d3 from 'd3';
import { select } from 'd3';
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
            // plotState: new PlotState(),
            data: null,
            trainX: null,
            trainY: null,
            opts: null,
            registeredStateListeners: [],
            computed: {},
            constants: {
                nameFontSize: 10,
                nameFontFamily: 'sans-serif',
                minZoom: 0.1,
                maxZoom: 50,
                nodeRectRatio: 20,
                nodeRectWidth: 240,
                detailedViewNodeRectWidth: 360,
                pathSummaryHeight: 180,
                scatterPlotPadding: 20,
                nodeRectStrokeWidth: 3,
                colorScale: d3.scaleOrdinal(["#e63946", "#a8dadc", "#457b9d", "#1d3557"]),
                featureColorScale: d3.scaleOrdinal(["#4e79a7","#f28e2c","#e15759","#76b7b2","#59a14f","#edc949","#af7aa1","#ff9da7","#9c755f","#bab0ab"]),
                featureArr: Array.from({length: 8}, (_, i) => `f_${i+1}`),
                texture: textures.paths().d("crosses").lighter().thicker(),
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
        const { data, opts, computed, parts, height, width, constants: { nodeRectRatio } } = this;
        
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
        let nodes = d3.hierarchy(this.data);
        nodes = parts.treeMap(nodes);
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
    update({ transitionOrigin = null, initialization = false, showTransition = false } = {}) {

    }


    /**
     * Render sankey-like links according to param links
     * param links should be an array of objects with 
     * length # of classes * # of links in the tree diagram.
     * @date 2022-06-14
     * @param {links} links
     */
    renderLinks(links) {
        const { parts, height, width, constants: { colorScale } } = this;
        const flowLinks = this.generateFlows(links);
        parts.svgGroup.selectAll(".link")
                .data(flowLinks)
                .enter().append("path")
                .attr("class", "link")
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
                .style("fill", (d) => colorScale(d.class))
                .style("stroke", "none");

    }


    /**
     * Render decision and leaf nodes according to the param nodes 
     * which is an array of node objects.
     * @date 2022-06-14
     * @param {nodes} nodes
     */
    renderNodes(nodes) {
        const { parts, width, height, constants: { nodeRectWidth, nodeRectRatio, nodeRectStrokeWidth, detailedViewNodeRectWidth, transitionDuration } } = this;
        let _this = this;

        // Click event listener to switch between summary and detailed views
        function clicked(event, node) {
            if (event.shiftKey && node.data.type === "decision") {
                let parentNodeGroup = select(this);
                if (parentNodeGroup.node().querySelector(".detailed") !== null || 
                    (parentNodeGroup.node().querySelector(".detailed") === null &&
                        parentNodeGroup.node().querySelector(".summary") === null)) {
                    // Fisrtly, remove the detailed view and render the summary view
                    parentNodeGroup.selectAll(".detailed").remove();
                    _this.renderSummaryView(parentNodeGroup);
                    select(this).select(".node-rect")
                    .transition()
                    .duration(transitionDuration)
                        .attr("x", - 0.5 * nodeRectWidth)
                        .attr("y", 0)
                        .attr("width", nodeRectWidth)
                        .attr("height", nodeRectWidth)
                } else {
                    select(this).select(".node-rect")
                    .transition()
                    .duration(transitionDuration)
                        .attr("x", - 0.5 * nodeRectWidth - 0.5 * (detailedViewNodeRectWidth - nodeRectWidth))
                        .attr("y", - 0.5 * (detailedViewNodeRectWidth - nodeRectWidth))
                        .attr("width", detailedViewNodeRectWidth)
                        .attr("height", detailedViewNodeRectWidth)
                    .on("end", () => {
                        // Remove the summary view and render the detailed view after the transition
                        parentNodeGroup.selectAll(".summary").remove();
                        _this.renderDetailedView(parentNodeGroup);
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
            .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
            .on("click", clicked);
        
        // Add a rectangle to each node
        node.append("rect")
            .attr("class", "node-rect")
            .attr("width", nodeRectWidth)
            .attr("height", (d) => d.data.type === "leaf" ? nodeRectWidth+2*nodeRectRatio : nodeRectWidth)
            .attr("x",- 0.5 * nodeRectWidth)
            .attr("y",0)
            .attr("rx", nodeRectRatio)
            .attr("ry", nodeRectRatio)
            .style("fill", "#fff")
            .style("stroke", (d) => d.data.type === "decision" ? "#005CAB" : "#E31B23")
            .style("stroke-width", nodeRectStrokeWidth);

        
        this.renderPathSummaryView(node);
        this.renderSummaryView(node);
        // this.renderDetailedView(node);

        node.append("text")
            .filter((d) => d.data.name === "root")
            .attr("x", -2.5*nodeRectWidth)
            .attr("y", 0.25*nodeRectWidth)
            .attr("class", "text node-rect")
            .text("Press Shift and click decision nodes to see their detailed view")
    }

    /**
     * Render summary view in each decision node
     * @date 2022-06-17
     * @param {node} node
     */
    renderSummaryView(node) {
        const { parts, width, height, constants: { nodeRectWidth, nodeRectRatio, featureArr, colorScale, featureColorScale } } = this;
        let _this = this;
        // TODO: draw class distribution, histograms
        // Draw class distribution
        node.each(function(nodeData, index) {
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
            let classDistribution = d3.select(this).selectAll("g")
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
                .style("fill", (d) => colorScale(d.label));

            if (nodeData.data.type === "decision") {
                if (nodeData.data.featureIdx.length === 2) {
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
                    
                    d3.select(this).selectAll("rect.coefficients")
                        .data(coefficientsData)
                        .join("rect")
                            .attr("class", "summary coefficients")
                            .attr("x", d => xCoefficient(d.name)-0.25*(nodeRectWidth-2*nodeRectRatio))
                            .attr("y", d => yCoefficient(d.weight)+0.2*(nodeRectWidth-2*nodeRectRatio))
                            .attr("width", xCoefficient.bandwidth())
                            .attr("height", d => 0.3*(nodeRectWidth-2*nodeRectRatio)-yCoefficient(d.weight))
                            .attr("fill", d => featureColorScale(d.name));

                    // Append x-axis for coefficients
                    d3.select(this).append("g")
                        .attr("class", "summary coefficients x-axis")
                        .attr("transform", `translate(${-0.25*(nodeRectWidth-2*nodeRectRatio)}, ${0.5*(nodeRectWidth-2*nodeRectRatio)})`)
                        .call(d3.axisBottom(xCoefficient))
                        .selectAll("text")
                            
                }
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
                d3.select(this).selectAll("g")
                    .data(splitData)
                    .enter()
                    .append("g")
                    .attr("class", "summary split-distribution")
                    .attr("transform", `translate(${0.5*nodeRectWidth},${nodeRectRatio})`);
                
                // Append left and right split distribution into splitDistribution svg group
                classDistribution.append("rect")
                    .attr("class", "summary split-rect")
                    .attr("width", (d) => {
                        return xRight(d[1]);
                    })
                    .attr("height", yBand.bandwidth())
                    .attr("x", - nodeRectRatio)
                    .attr("y", (d, i) => yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio))
                    .attr("fill", (d, i) => colorScale(i));

                classDistribution.append("rect")
                    .attr("class", "summary split-rect")
                    .attr("width", (d) => {
                        return 0.5*(nodeRectWidth-2*nodeRectRatio)-xLeft(d[0]);
                    })
                    .attr("height", yBand.bandwidth())
                    .attr("x", (d) => -0.5*nodeRectWidth+xLeft(d[0]))
                    .attr("y", (d, i) => yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio))
                    .attr("fill", (d, i) => colorScale(i));

                // Append left and right split distribution text into splitDistribution svg group
                classDistribution.append("text")
                    .attr("class", "summary split-text")
                    .text( (d) => d[1])
                    .attr("text-anchor", "start")
                    .attr("font-size", "11px")
                    .attr("fill", "black")
                    .attr("transform", (d, i) => {
                        return `translate(${-nodeRectRatio+xRight(d[1])+10},
                            ${5+0.5*yBand.bandwidth()+yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio)})`;
                    })
                
                classDistribution.append("text")
                    .attr("class", "summary split-text")
                    .text( (d) => d[0])
                    .attr("text-anchor", "end")
                    .attr("font-size", "11px")
                    .attr("fill", "black")
                    .attr("transform", (d, i) => {
                        return `translate(${-0.5*nodeRectWidth+xLeft(d[0])-10},
                            ${5+0.5*yBand.bandwidth()+yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio)})`;
                    })

                // Append centered axis
                classDistribution.append("g")
                    .attr("class", "summary center-axis")
                    .attr("transform", `translate(${-nodeRectRatio},
                        ${0.5*(nodeRectWidth-2*nodeRectRatio)})`)
                    .call(d3.axisLeft(yBand).tickFormat(""));

                classDistribution.append("g")
                    .attr("class", "summary center-axis")
                    .attr("transform", `translate(${-nodeRectRatio},
                        ${0.5*(nodeRectWidth-2*nodeRectRatio)})`)
                    .call(d3.axisRight(yBand).tickFormat(""));
            }
            
        })
    }

    /**
     * Render detailed view in each decision node
     * @date 2022-06-16
     * @param {node} node
     */
    renderDetailedView(node) {
        const { parts, width, height, constants: { nodeRectWidth, nodeRectRatio, detailedViewNodeRectWidth, scatterPlotPadding, colorScale, featureArr, texture } } = this;
        let _this = this;
        // Map two feature variables into visual representations
        const x = featureArr.map(f => d3.scaleLinear()
            .domain(d3.extent(this.trainX, d => d[f]))
            .range([scatterPlotPadding, nodeRectWidth-scatterPlotPadding]));

        const y = x.map(x => x.copy()
            .range([nodeRectWidth-scatterPlotPadding, scatterPlotPadding]));

        // Add dots in each decision node
        node.each(function (nodeData, index) {
            let currFeatureIdx = nodeData.data.featureIdx;
            if (currFeatureIdx.length === 2) {
                // Allow X and Y axis generators to be called
                node.append("g")
                    .attr("class", "detailed x-axis")
                    .attr("transform", `translate(${-0.5*nodeRectWidth}, ${nodeRectWidth-scatterPlotPadding})`)
                    .call(d3.axisBottom(x[currFeatureIdx[0]]));
                node.append("g")
                    .attr("class", "detailed y-axis")
                    .attr("transform", `translate(${-0.5*nodeRectWidth}, ${0})`)
                    .call(d3.axisLeft(y[currFeatureIdx[1]]));
                
                const randomPoints = getRandomSplitPoint(currFeatureIdx, nodeData, _this);
                const lineHelper = d3.line().x(d => x[currFeatureIdx[0]](d.x)).y(d => y[currFeatureIdx[1]](d.y));

                d3.select(this)
                    .append("path")
                    .datum(randomPoints)
                        .attr("class", "detailed split-line")
                        .attr("d", (d) => lineHelper(d))
                        .attr("transform", `translate(${- 0.5 * nodeRectWidth}, ${0})`)
                        .style('fill', 'none')
                        .style('stroke', 'black')
                        .style('stroke-width', '2px');

                d3.select(this).selectAll("circle")
                    .data(nodeData.data.subTrainingSet)
                    .enter()
                    .append("circle")
                        .attr("class", "detailed dot")
                        .attr("cx", (d) => {
                            return x[currFeatureIdx[0]](_this.trainX[d][featureArr[currFeatureIdx[0]]])-0.5*nodeRectWidth;
                        })
                        .attr("cy", (d) => {
                            return y[currFeatureIdx[1]](_this.trainX[d][featureArr[currFeatureIdx[1]]]);
                        })
                        .attr("r", 3.5)
                        .style("fill", d => colorScale(_this.trainY[d]));

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
                    value: _this.trainX[idx][featureArr[currFeatureIdx[0]]],
                    label: _this.trainY[idx],
                })),
                    values1Right = nodeData.data.rightSubTrainingSet.map(idx => ({
                    value: _this.trainX[idx][featureArr[currFeatureIdx[0]]],
                    label: _this.trainY[idx],
                })),
                    values2Left = nodeData.data.leftSubTrainingSet.map(idx => ({
                        value: _this.trainX[idx][featureArr[currFeatureIdx[1]]],
                        label: _this.trainY[idx],
                    })),
                    values2Right = nodeData.data.rightSubTrainingSet.map(idx => ({
                        value: _this.trainX[idx][featureArr[currFeatureIdx[1]]],
                        label: _this.trainY[idx],
                    }));
                // Get the histogram data according to predefined histogram functions
                const bins1Left = histogram1(values1Left),
                    bins1Right = histogram1(values1Right),
                    bins2Left = histogram2(values2Left),
                    bins2Right = histogram2(values2Right);

                // Set up y-axis value encodings for histograms
                const yHistogram1 = d3.scaleLinear()
                        .domain([0, Math.max(d3.max(bins1Left, d => d.length), d3.max(bins1Right, d => d.length))])
                        .range([0.5*(detailedViewNodeRectWidth-nodeRectWidth-scatterPlotPadding), 0.5*scatterPlotPadding]),
                    yHistogram2 = d3.scaleLinear()
                        .domain([0, Math.max(d3.max(bins2Left, d => d.length), d3.max(bins2Right, d => d.length))])
                        .range([0.5*(detailedViewNodeRectWidth-nodeRectWidth-scatterPlotPadding), 0.5*scatterPlotPadding]);
                // Draw histograms

                d3.select(this).call(texture);

                d3.select(this).selectAll("rect.histogram.x-histogram.left")
                    .data(bins1Left)
                    .join("rect")
                    .attr("class", "detailed histogram")
                    .attr("x", 2)
                    .attr("transform", d => `translate(${x[currFeatureIdx[0]](d.x0)-0.5*nodeRectWidth}, ${yHistogram1(d.length)-0.5*(detailedViewNodeRectWidth-nodeRectWidth)})`)
                    .attr("width", d => x[currFeatureIdx[0]](d.x1)-x[currFeatureIdx[0]](d.x0) - 1)
                    .attr("height", d => 0.5*(detailedViewNodeRectWidth-nodeRectWidth)-yHistogram1(d.length))
                    .attr("fill", "#ffd700")
                    .style("opacity", 0.6);
                
                d3.select(this).selectAll("rect.histogram.x-histogram.right")
                    .data(bins1Right)
                    .join("rect")
                    .attr("class", "detailed histogram")
                    .attr("x", 2)
                    .attr("transform", d => `translate(${x[currFeatureIdx[0]](d.x0)-0.5*nodeRectWidth}, ${yHistogram1(d.length)-0.5*(detailedViewNodeRectWidth-nodeRectWidth)})`)
                    .attr("width", d => x[currFeatureIdx[0]](d.x1)-x[currFeatureIdx[0]](d.x0) - 1)
                    .attr("height", d => 0.5*(detailedViewNodeRectWidth-nodeRectWidth)-yHistogram1(d.length))
                    .attr("fill", "#0000ff")
                    .style("opacity", 0.6);

                d3.select(this).selectAll("rect.histogram.y-histogram.left")
                    .data(bins2Left)
                    .join("rect")
                    .attr("class", "detailed histogram")
                    .attr("y", 2)
                    .attr("transform", d => `translate(${0.5*(nodeRectWidth)}, ${x[currFeatureIdx[1]](d.x0)})`)
                    .attr("width", d => yHistogram2(d.length))
                    .attr("height", d => x[currFeatureIdx[1]](d.x1)-x[currFeatureIdx[1]](d.x0)-1)
                    .attr("fill", "#ffd700")
                    .style("opacity", 0.6);

                d3.select(this).selectAll("rect.histogram.y-histogram.right")
                    .data(bins2Right)
                    .join("rect")
                    .attr("class", "detailed histogram")
                    .attr("y", 2)
                    .attr("transform", d => `translate(${0.5*(nodeRectWidth)}, ${x[currFeatureIdx[1]](d.x0)})`)
                    .attr("width", d => yHistogram2(d.length))
                    .attr("height", d => x[currFeatureIdx[1]](d.x1)-x[currFeatureIdx[1]](d.x0)-1)
                    .attr("fill", "#0000ff")
                    .style("opacity", 0.6);
            }
        })
    }

    /**
     * Render path summary view, including feature contributions
     * @date 2022-06-17
     * @param {node} node
     */
    renderPathSummaryView(node) {
        const { parts, width, height, constants: { nodeRectWidth, nodeRectRatio, nodeRectStrokeWidth, colorScale, pathSummaryHeight } } = this;
        let _this = this;
        // Add a rectangle under each leaf node

        // Draw histogram for feature contribution
        node.each(function (nodeData, index) {
            if (nodeData.data.type === "leaf") {
                const { fcArr, fcRange } = getEffectiveFeatureContribution(nodeData, _this);
                // TODO: determine scale for feature contribution
                let x = d3.scaleLinear()
                    .domain(fcRange)
                    .range([0, nodeRectWidth-4*nodeRectRatio]),
                    yBand = d3.scaleBand()
                    .range([0, (1/(fcArr.length))*(nodeRectWidth-2*nodeRectRatio)-0.5*nodeRectRatio])
                    .domain([0,1,2])
                    .padding(.1);
                fcArr.forEach((fc, idx) => {
                    d3.select(this).selectAll("g")
                        .data(fc.featureContribution)
                        .enter()
                        .append("rect")
                            .attr("class", "path-summary feature-contribution-rect")
                            .attr("x", (d) => x(Math.min(0, d.value)) - x(0))
                            .attr('rx', 5)
                            .attr("y", (d) => 3*nodeRectRatio
                                 +yBand(d.label)+idx*(1/fcArr.length)*(nodeRectWidth-2*nodeRectRatio))
                            .attr("width", (d) => Math.abs(x(d.value) - x(0)))
                            .attr("height", yBand.bandwidth())
                            .attr("fill", (d) => colorScale(d.label));
                })
            }
        });
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
                    value: (ele / currSize) * currWidth
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
                if (link.data.totalCount[val.label] === currParentCountArr[idx]) {
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
 * Return random points on current split
 * @date 2022-06-21
 * @param {featureIdxArr} featureIdxArr
 * @param {currNode} currNode
 * @param {that} that
 */
const getRandomSplitPoint = (featureIdxArr, currNode, that) => {
    const getRandomFloat = (range, decimals) => {
        const str = (Math.random() * (range[1] - range[0]) + range[0]).toFixed(decimals);
        return parseFloat(str);
    }
    const sv = currNode.data.split;
    const rangeX = d3.extent(that.trainX, d => d[that.constants.featureArr[featureIdxArr[0]]]);
    const rangeY = d3.extent(that.trainX, d => d[that.constants.featureArr[featureIdxArr[1]]]);
    const randomXYPairs = [];
    let tmpRandomX, tmpRandomY;
    while (randomXYPairs.length < 10) {
        tmpRandomX = getRandomFloat(rangeX, 4);
        tmpRandomY = (sv[featureIdxArr[0]] * tmpRandomX + sv[sv.length-1]) / (- sv[featureIdxArr[1]]);
        if (tmpRandomY >= rangeY[0] && tmpRandomY <= rangeY[1]) {
            randomXYPairs.push({
                x: tmpRandomX,
                y: tmpRandomY
            })
        }
    };
    return randomXYPairs;
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


const kernelDensityEstimator = (kernel, X) => {
    return (V) => {
        return X.map((x) => {
            return [x, d3.mean(V, (v) => kernel(x - v))];
        })
    }
};

const kernelEpanechnikov = (k) => {
    return (v) => {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    }
} 

Odt.initClass();
export default Odt;