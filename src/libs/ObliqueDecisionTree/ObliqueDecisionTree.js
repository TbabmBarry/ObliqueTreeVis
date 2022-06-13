import * as d3 from 'd3';
// import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
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
            .attr('height', height)

        let i = 0;
        parts.svgGroup = parts.baseSvg
                            .append('g')
                            .attr("transform",
                                `translate(${50},${50})`)
                            .attr('class', 'treeGroup')

        parts.treeMap = d3.tree().size([width - 200, height - 200]);

        let nodes = d3.hierarchy(this.data);
        nodes = parts.treeMap(nodes);
        const links = parts.svgGroup.selectAll(".link")
                                    .data(nodes.descendants().slice(1))
                                    .enter().append("path")
                                    .attr("class", "link")
                                    .attr("d", (d) => {
                                        // return "M" + d.x + "," + d.y
                                        //     + "C" + d.x + "," + (d.y + d.parent.y) / 2
                                        //     + " " + d.parent.x + "," +  (d.y + d.parent.y) / 2
                                        //     + " " + d.parent.x + "," + d.parent.y;
                                        return d3.area().curve(d3.curveBumpY).x(dd => dd.x).y0(dd => dd.y0).y1(dd => dd.y1)([
                                            {
                                                x: d.parent.x + 25,
                                                y0: d.parent.y + 25,
                                                y1: d.parent.y + 25,
                                            },
                                            {
                                                x: d.x + 25,
                                                y0: d.y + 25,
                                                y1: d.y + 50,
                                            }
                                        ]);
                                    })
                                    .style("fill", "blue")
                                    .style("stroke", "#ccc")
                                    .style("stroke-width", "2px")
        
        const node = parts.svgGroup.selectAll(".node")
                                    .data(nodes.descendants())
                                    .enter().append("g")
                                    .attr("class", (d) => { 
                                        return "node" + 
                                        (d.children ? " node--internal" : " node--leaf"); 
                                    })
                                    .attr("transform", (d) => { 
                                        return "translate(" + d.x + "," + d.y + ")"; 
                                    });
        
        // adds the rectangle to the node
        node.append("rect")
            .attr("width", 80)
            .attr("height", 80)
            .attr("x",-10)
            .attr("y",0)
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

        // adds the text to the node
        node.append("text")
            .attr("dy", ".35em")
            .attr("y", (d) => { return d.children ? -20 : 20; })
            .style("text-anchor", "middle")
            .style("font", "12px sans-serif")
            .text((d) => { return d.data.name; });
    }

    update({ transitionOrigin = null, initialization = false, showTransition = false } = {}) {

    }

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

    setDataAndOpts(opts, data) {
        this.opts = opts;
        this.data = this.processData(this.opts, data);
    }

}

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