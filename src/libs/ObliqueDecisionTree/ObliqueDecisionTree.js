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
        const { data, opts, computed, parts, height, width, constants: { minZoom, maxZoom } } = this;

        parts.baseSvg = d3.select(this.rootElement)
            .append('svg')
            .attr('id', this.id)
            .attr('class', 'svg-content-responsive')
            .attr('width', width)
            .attr('height', height)
            .style('border', '1px solid black');
        
        console.log(this);
    }

    update({ transitionOrigin = null, initialization = false, showTransition = false } = {}) {

    }

    processData(opts, data) {
        let curr_index = 1;

        const helper = (curr_node) => {
            return {
                [ID]: `${(curr_node[opts.id || ID] || curr_index++)}`.replace(/ /g, ''),
                [NAME]: curr_node[opts.name || NAME],
                [VALUE]: curr_node[opts.value || VALUE],
                [CHILDREN]: _(curr_node[opts.childrenName] || curr_node[CHILDREN] || curr_node._children).map(helper).value(),
                
                // TODO: think about data for tooltip and other detailed visualization
            };
        };

        return helper(data);
    }

    setDataAndOpts(opts, data) {
        this.opts = opts;
        this.data = this.processData(data, this.opts);
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