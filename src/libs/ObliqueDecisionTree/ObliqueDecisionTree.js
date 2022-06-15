import * as d3 from 'd3';
import _ from 'lodash';

const ID = 'id';
const NAME = 'name';
const VALUE = 'value';
const CHILDREN = 'odtChildren';
const STATE_VERSION = 1;

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
                nodeRectWidth: 5,
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
        const { data, opts, computed, parts, height, width, constants: { minZoom, maxZoom, treeMargins } } = this;

        parts.baseSvg = d3.select(this.rootElement)
            .append('svg')
            .attr('id', this.id)
            .attr('class', 'svg-content-responsive')
            .attr('width', width)
            .attr('height', height);

        let i = 0;
        parts.svgGroup = parts.baseSvg
                            .append('g')
                            .attr("transform",
                                `translate(${50},${50})`)
                            .attr('class', 'treeGroup')

        parts.treeMap = d3.tree().size([width - 200, height - 200]);

        let nodes = d3.hierarchy(this.data);
        nodes = parts.treeMap(nodes);
        
        // Render Oblique Tree Links and Nodes
        console.log("Input links: ", nodes.descendants().slice(1));
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
        const { parts, height, width } = this;
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        const testArr = this.generateFlows(links);
        console.log("Processed links: ", testArr);
        parts.svgGroup.selectAll(".link")
                .data(testArr)
                .enter().append("path")
                .attr("class", "link")
                .attr("d", (d) => {
                    // return "M" + d.x + "," + d.y
                    //     + "C" + d.x + "," + (d.y + d.parent.y) / 2
                    //     + " " + d.parent.x + "," +  (d.y + d.parent.y) / 2
                    //     + " " + d.parent.x + "," + d.parent.y;
                    // TODO: Consider add color scale according to its class distribution
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
        const { parts, width, height } = this;

        const node = parts.svgGroup.selectAll(".node")
                                    .data(nodes)
                                    .enter().append("g")
                                    .attr("class", (d) => { 
                                        return "node" + 
                                        (d.children ? " node--internal" : " node--leaf"); 
                                    })
                                    .attr("transform", (d) => { 
                                        return "translate(" + d.x + "," + d.y + ")"; 
                                    });
        
        // Add a rectangle to each node
        node.append("rect")
            .attr("width", 80)
            .attr("height", 80)
            .attr("x",-30)
            .attr("y",-50)
            .attr("rx",6)
            .attr("ry",6)
            .style("fill", "#fff")
            .style("stroke", "steelblue")
            .style("stroke-width", "3px");
        
        const x = d3.scaleLinear()
                    .domain([0, 10])
                    .range([10, 80]);
        const y = d3.scaleLinear()
                    .domain([0, 10])
                    .range([10, 80]);

        node.each((nodeData, index) => {
            d3.select(node._groups[0][index]).selectAll("circle")
                .data(nodeData.data.samples)
                .enter()
                .append("circle")
                    .attr("cx", (d) => {
                        return x(d["Length"]);
                    })
                    .attr("cy", (d) => {
                        return y(d["Height"]);
                    })
                    .attr("r", 3.5)
                    .attr("class", (d) => {
                        return `${d["Year"]}--${index}}`;
                    })
                    .style("fill", "#ff0000");
        })

        // Add texts to each node
        node.append("text")
            .attr("dy", ".35em")
            .attr("y", (d) => { return d.children ? -20 : 20; })
            .style("text-anchor", "middle")
            .style("font", "12px sans-serif")
            .text((d) => { return d.data.name; });
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
     * Process data according to options and return d3.hierarchy() compatible object.  
     * @date 2022-06-14
     * @param {opts} opts
     * @param {data} data
     */
    processData(opts, data) {
        let curr_index = 1;

        const helper = (curr_node) => {
            return curr_node;

            // TODO: think about data for tooltip and other detailed visualization
            // return {
            //     [ID]: `${(curr_node[opts.id || ID] || curr_index++)}`.replace(/ /g, ''),
            //     [NAME]: curr_node[opts.name || NAME],
            //     [VALUE]: curr_node[opts.value || VALUE],
            //     [CHILDREN]: _(curr_node[opts.childrenName] || curr_node[CHILDREN] || curr_node._children).map(helper).value(),
                
            // };
        };

        return helper(data);
    }

    /**
     * Set preprocessed data and options.
     * @date 2022-06-14
     * @param {opts} opts
     * @param {data} data
     */
    setDataAndOpts(opts, data) {
        this.opts = opts;
        this.data = this.processData(this.opts, data);
    }

    /**
     * Return an array of processed link object with structure
     * {"source": {x: , y: , width: }, "target": {x: , y: , width: }, class: }
     * @date 2022-06-15
     * @param {links} links
     */
    generateFlows(links) {
        const widthFlow = 40;
        let currParentWidth = widthFlow, currChildWidth = widthFlow;
        let currParentSize, currChildSize;
        const fullsize = links[0].parent.data.distribution.reduce((partialSum, ele) => partialSum + ele, 0);
        const resFlows = [];
        let currParentX, currChildX;
        for (const link of links) {
            currParentSize = link.parent.data.distribution.reduce((partialSum, ele) => partialSum + ele, 0);
            currChildSize = link.data.distribution.reduce((partialSum, ele) => partialSum + ele, 0);
            currParentWidth = Math.ceil((currParentSize / fullsize) * widthFlow);
            currChildWidth = Math.ceil((currChildSize / fullsize) * widthFlow);
            const parentWidthArr = link.parent.data.distribution.map(ele => Math.ceil((ele / currParentSize) * currParentWidth));
            const childWidthArr = link.data.distribution.map(ele => Math.ceil((ele / currChildSize) * currChildWidth));
            currParentX = link.parent.x;
            currChildX = link.x;
            parentWidthArr.forEach((val, idx) => {
                currParentX += idx > 0 ? 0.5 * (parentWidthArr[idx-1] + parentWidthArr[idx]) : 0;
                currChildX += idx > 0 ? 0.5 * (childWidthArr[idx-1] + childWidthArr[idx]) : 0;
                resFlows.push({
                    source: {
                        x: currParentX,
                        y: link.parent.y,
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
    return curr;
};

Odt.initClass();
export default Odt;