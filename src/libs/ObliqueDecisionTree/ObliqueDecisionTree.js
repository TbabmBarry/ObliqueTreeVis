import * as d3 from 'd3';
import { select } from 'd3';
import _ from 'lodash';

// const ID = 'id';
// const NAME = 'name';
// const VALUE = 'value';
// const CHILDREN = 'odtChildren';
// const STATE_VERSION = 1;

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
                innerLabelPadding: 1,
                nameFontSize: 10,
                nameFontFamily: 'sans-serif',
                minZoom: 0.1,
                maxZoom: 50,
                stateResizeTolerance: 2,
                pxPerChar: 7,
                nodeTextDx: 10,
                nodeRectRatio: 20,
                nodeRectWidth: 240,
                pathSummaryHeight: 180,
                scatterPlotPadding: 20,
                nodeRectStrokeWidth: 3,
                colorScale: d3.scaleOrdinal(d3.schemeCategory10),
                maxLines: 5,
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
                            // .attr("transform",
                            //     `translate(${50},${50})`)
                            .attr('class', 'oblique-tree')

        parts.treeMap = d3.tree().size([width, height]);

        let nodes = d3.hierarchy(this.data);
        nodes = parts.treeMap(nodes);

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
                    // return "M" + d.x + "," + d.y
                    //     + "C" + d.x + "," + (d.y + d.parent.y) / 2
                    //     + " " + d.parent.x + "," +  (d.y + d.parent.y) / 2
                    //     + " " + d.parent.x + "," + d.parent.y;
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
        const { parts, width, height, constants: { nodeRectWidth, nodeRectRatio, nodeRectStrokeWidth, colorScale, pathSummaryHeight } } = this;
        let _this = this;

        // Click event listener to switch between summary and detailed views
        function clicked(event, data) {
            if (event.shiftKey) {
                let parentNodeGroup = select(this);
                if (parentNodeGroup.node().querySelector(".detailed") !== null || 
                    (parentNodeGroup.node().querySelector(".detailed") === null &&
                        parentNodeGroup.node().querySelector(".summary") === null)) {
                    parentNodeGroup.selectAll(".detailed").remove();
                    _this.renderSummaryView(parentNodeGroup);
                } else {
                    parentNodeGroup.selectAll(".summary").remove();
                    _this.renderDetailedView(parentNodeGroup);
                }
            }
        }

        // Mouse over event listener to highlight hover effects
        function mouseOver(event, data) {
            if (event.shiftKey) {
                select(this).select(".node-rect").transition().duration(100).style("fill", "red");
            }
        }

        // Mouse out event listener to recover node style
        function mouseOut(event, data) {
            select(this).select(".node-rect").style("fill", "#fff");
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
            // .on("mouseover", mouseOver)
            // .on("mouseout", mouseOut)
            .on("click", clicked);
        
        // Add a rectangle to each node
        node.append("rect")
            .attr("class", "node-rect")
            .attr("width", nodeRectWidth)
            .attr("height", nodeRectWidth)
            .attr("x",- 0.5 * nodeRectWidth)
            .attr("y",0)
            .attr("rx", nodeRectRatio)
            .attr("ry", nodeRectRatio)
            .style("fill", "#fff")
            .style("stroke", "#005CAB")
            .style("stroke-width", nodeRectStrokeWidth)

        
        this.renderPathSummaryView(node);
        this.renderSummaryView(node);
        // this.renderDetailedView(node);

    }

    /**
     * Render summary view in each decision node
     * @date 2022-06-17
     * @param {node} node
     */
    renderSummaryView(node) {
        const { parts, width, height, constants: { nodeRectWidth, nodeRectRatio, scatterPlotPadding, colorScale } } = this;
        
        // TODO: draw class distribution, histograms
        // Draw class distribution
        node.each(function(nodeData, index) {
            // Encode current decision node class distribution into the range of node rect width
            let xTotal = d3.scaleLinear()
                .domain([0, _.sum(nodeData.data.totalCount)])
                .range([0, nodeRectWidth - 2 * nodeRectRatio]);
            
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
                .attr("width", (d) => xTotal(d.end - d.start))
                .attr("height", nodeRectRatio)
                .attr("x", (d) => - 0.5 * (nodeRectWidth) + xTotal(d.start))
                .style("fill", (d) => colorScale(d.label));

            if (nodeData.data.type == "decision") {
                let xRight = d3.scaleLinear()
                    .domain([0, _.sum(nodeData.data.totalCount)])
                    .range([0, 0.5 * (nodeRectWidth - 2 * nodeRectRatio)]),
                    xLeft = d3.scaleLinear()
                    .domain([_.sum(nodeData.data.totalCount), 0])
                    .range([0, 0.5 * (nodeRectWidth - 2 * nodeRectRatio)]);
                let yBand = d3.scaleBand()
                    .range([0, nodeRectWidth - 4 * nodeRectRatio])
                    .domain([0,1,2])
                    .padding(.1);

                const splitData = nodeData.data.leftCount.map((val, idx) => [val, nodeData.data.rightCount[idx]]);
                d3.select(this).selectAll("g")
                    .data(splitData)
                    .enter()
                    .append("g")
                    .attr("class", "summary split-distribution")
                    .attr("transform", `translate(${0.5 * nodeRectWidth}, ${nodeRectRatio})`);
                
                // Append left and right split distribution into splitDistribution svg group
                classDistribution.append("rect")
                    .attr("class", "summary split-rect")
                    .attr("width", (d) => {
                        return xRight(d[1]);
                    })
                    .attr("height", yBand.bandwidth())
                    .attr("x", - nodeRectRatio)
                    .attr("y", (d, i) => yBand(i) + 2 * nodeRectRatio)
                    .attr("fill", (d, i) => colorScale(i));

                classDistribution.append("rect")
                    .attr("class", "summary split-rect")
                    .attr("width", (d) => {
                        return 0.5 * (nodeRectWidth - 2 * nodeRectRatio) - xLeft(d[0]);
                    })
                    .attr("height", yBand.bandwidth())
                    .attr("x", (d) => - 0.5 * nodeRectWidth + xLeft(d[0]))
                    .attr("y", (d, i) => yBand(i) + 2 * nodeRectRatio)
                    .attr("fill", (d, i) => colorScale(i));
            }
            
        })
    }

    /**
     * Render detailed view in each decision node
     * @date 2022-06-16
     * @param {node} node
     */
    renderDetailedView(node) {
        const { parts, width, height, constants: { nodeRectWidth, nodeRectRatio, scatterPlotPadding, colorScale } } = this;
        let _this = this;
        // Map two feature variables into visual representations
        const featureArr = Array.from({length: 8}, (_, i) => `f_${i+1}`);
        const x = featureArr.map(f => d3.scaleLinear()
            .domain(d3.extent(this.trainX, d => d[f]))
            .range([scatterPlotPadding, nodeRectWidth - scatterPlotPadding]));

        const y = x.map(x => x.copy()
            .range([scatterPlotPadding, nodeRectWidth - scatterPlotPadding]));

        // Add dots in each decision node
        node.each(function (nodeData, index) {
            let currFeatureIdx = nodeData.data.featureIdx;
            if (currFeatureIdx.length === 2) {
                // Allow X and Y axis generators to be called
                node.append("g")
                    .attr("class", "detailed x-axis")
                    .attr("transform", `translate(${- 0.5 * nodeRectWidth}, ${nodeRectWidth - scatterPlotPadding})`)
                    .call(d3.axisBottom(x[currFeatureIdx[0]]));
                node.append("g")
                    .attr("class", "detailed y-axis")
                    .attr("transform", `translate(${- 0.5 * nodeRectWidth}, ${0})`)
                    .call(d3.axisLeft(y[currFeatureIdx[1]]));

                d3.select(this).selectAll("circle")
                    .data(nodeData.data.subTrainingSet)
                    .enter()
                    .append("circle")
                        .attr("class", "detailed dot")
                        .attr("cx", (d) => {
                            return x[currFeatureIdx[0]](_this.trainX[d][featureArr[currFeatureIdx[0]]]) - 0.5 * nodeRectWidth;
                        })
                        .attr("cy", (d) => {
                            return y[currFeatureIdx[1]](_this.trainX[d][featureArr[currFeatureIdx[1]]]);
                        })
                        .attr("r", 3.5)
                        .style("fill", d => colorScale(_this.trainY[d]));
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
        // Add a rectangle under each leaf node
        node.append("rect")
            .filter((d) => d.children == null)
            .attr("class", 'node-rect leaf-node')
            .attr("width", nodeRectWidth)
            .attr("height", pathSummaryHeight)
            .attr("x", - 0.5 * nodeRectWidth)
            .attr("y", nodeRectWidth + nodeRectStrokeWidth)
            .attr("rx", nodeRectRatio)
            .attr("ry", nodeRectRatio)
            .style("fill", "#fff")
            .style("stroke", "#E31B23")
            .style("stroke-width", nodeRectStrokeWidth);

        // TODO: draw boxplot/violinplot/histogram for feature contribution
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
        let currParentWidth = widthFlow, currChildWidth = widthFlow;
        let currParentSize, currChildSize;
        const fullsize = _.sum(links[0].parent.data.totalCount);
        const resFlows = [];
        let currParentX, currChildX;
        for (const link of links) {
            currParentSize = _.sum(link.parent.data.totalCount);
            currChildSize = _.sum(link.data.totalCount);
            currParentWidth = Math.ceil((currParentSize / fullsize) * widthFlow);
            currChildWidth = Math.ceil((currChildSize / fullsize) * widthFlow);
            const parentWidthArr = link.parent.data.totalCount.map(ele => Math.ceil((ele / currParentSize) * currParentWidth));
            const childWidthArr = link.data.totalCount.map(ele => Math.ceil((ele / currChildSize) * currChildWidth));
            currParentX = link.parent.x;
            currChildX = link.x;
            parentWidthArr.forEach((val, idx) => {
                currParentX += idx > 0 ? 0.5 * (parentWidthArr[idx-1] + parentWidthArr[idx]) : - 0.5 * (_.sum(parentWidthArr) - parentWidthArr[idx]);
                currChildX += idx > 0 ? 0.5 * (childWidthArr[idx-1] + childWidthArr[idx]) : - 0.5 * (_.sum(childWidthArr) - childWidthArr[idx]);
                resFlows.push({
                    source: {
                        x: currParentX,
                        y: link.parent.y + nodeRectWidth,
                        width: childWidthArr[idx],
                    },
                    target: {
                        x: currChildX,
                        y: link.y,
                        width: childWidthArr[idx],
                    },
                    class: idx,
                });
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
    curr.height *= 2;
    return curr;
};

Odt.initClass();
export default Odt;