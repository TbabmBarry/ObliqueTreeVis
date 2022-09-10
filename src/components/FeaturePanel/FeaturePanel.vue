<template>
    <div class="w-full h-screen">
        <div class="feature-table w-full"></div>
    </div>
</template>
<script setup>
import _ from 'lodash';
import { inject, reactive, toRefs, watch, onMounted } from "vue";

let d3 = inject("d3");

const emit = defineEmits(["emitSelectedFeaturesChanged"]);

const props = defineProps({
    featureTable: {
        type: Array,
        default: () => []
    },
    exposedFeatureContributions: {
        type: Array,
        default: () => []
    }
});

const state = reactive({
    rootElement: {},
    featureTable: [],
    colorScale: ["#66c2a5", "#fc8d62", "#8da0cb"],
    boxplotMin: Number.POSITIVE_INFINITY,
    boxplotMax: Number.NEGATIVE_INFINITY,
    contributionMin: -1,
    contributionMax: 1,
    isSorted: false,
    width: 0,
    height: 0,
    padding: 40,
    exposedFeatures: [],
    highlightedFeatures: {},
    selectedFeatures: {},
    highlightedFeatureClass: "rounded-md outline-dashed outline-3 outline-offset-2 outline-slate-500 shadow-lg shadow-slate-500/50",
    selectedFeatureClass: "bg-slate-500",
});

onMounted(() => {
    state.rootElement = document.querySelector(".feature-table");
});

const initFeatureTable = () => {
    // remove all existing elements
    d3.select(".feature-table").selectAll("*").remove();
    state.boxplotMin = Number.POSITIVE_INFINITY;
    state.boxplotMax = Number.NEGATIVE_INFINITY;
    const { width, height } = _.pick(state.rootElement.getBoundingClientRect(), ["width", "height"]);
    state.width = width;
    state.height = height;
    let tableSvg = d3.select(".feature-table");
    // Append a table to the div
    let table = tableSvg.append("table")
        .attr("class", "table-auto w-full rounded border-separate border border-slate-400")
        .attr("id", "feature-table")
        .classed("display", true);

    // Append a header to the table
    let thead = table.append("thead")
        .attr("class", "table-header");

    // append a row to the header
    let theadRow = thead.append("tr")
        .attr("class", "header-row");
    
    state.featureTable.forEach((feature) => {
        // Find the min and max of the feature contribution
        // state.contributionMin > d3.min(feature.contribution) ? state.contributionMin = d3.min(feature.contribution) : state.contributionMin;
        // state.contributionMax < d3.max(feature.contribution) ? state.contributionMax = d3.max(feature.contribution) : state.contributionMax;
        // Find the min and max of the feature boxplot
        feature.boxplot.forEach((ele) => {
            state.boxplotMin > ele.min ? state.boxplotMin = ele.min : state.boxplotMin;
            state.boxplotMax < ele.max ? state.boxplotMax = ele.max : state.boxplotMax;
        })
        state.selectedFeatures[feature.name] = false;
    })
    // return a selection of cell elements in the header row
    // attribute (join) data to the selection
    // update (enter) the selection with nodes that have data
    // append the cell elements to the header row
    // return the text string for each item in the data array
    theadRow.selectAll("th")
        .data(Object.keys(state.featureTable[0]))
        .enter()
        .append("th")
        .attr("class", "border rounded font-bold text-base border-slate-300")
        .attr("id", (d) => `header-${d}`) // set the id attribute for each cell
        .append((d) => drawLegend(d));

    // Render the table body
    renderTableBody(table, state.featureTable);
}

const sortFeatureTableByContribution = () => {
    let tb, rows, switching, contributionA, contributionB;
    tb = document.getElementById("feature-table");
    rows = tb.rows;
    switching = true;
    // Set the sorting direction to descending:
    while (switching) {
        switching = false;
        for (let i = 1; i < (rows.length - 1); i++) {
            contributionA = d3.mean(d3.select(rows[i].getElementsByTagName("td")[1]).select("g").data()[0].value.map((ele) => Math.abs(ele)));
            contributionB = d3.mean(d3.select(rows[i+1].getElementsByTagName("td")[1]).select("g").data()[0].value.map((ele) => Math.abs(ele)));
            if (contributionA < contributionB) {
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
            }
        }
    }
    d3.select("path.legend-triangle")
        .attr("opacity", 0.5);
    state.isSorted = true;
}

const sortFeatureTableByName = () => {
    let tb, rows, switching, a, b;
    tb = document.getElementById("feature-table");
    rows = tb.rows;
    switching = true;
    // Set the sorting direction to descending:
    while (switching) {
        switching = false;
        for (let i = 1; i < (rows.length - 1); i++) {
            a = d3.select(rows[i].getElementsByTagName("td")[0]).select("g").data()[0].value;
            b = d3.select(rows[i+1].getElementsByTagName("td")[0]).select("g").data()[0].value;
            if (a > b) {
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
            }
        }
    }
    d3.select("path.legend-triangle")
        .attr("opacity", 1);
    state.isSorted = false;
}

const renderTableBody = (targetSelection, tableData) => {
    // Append a body to the table
    let tbody = targetSelection.append("tbody")
        .attr("class", "table-body");
    // Append table body rows
    let tbdoyRow = tbody.selectAll("tr")
        .data(tableData)
        .enter()
        .append("tr")
        .attr("class", "body-row align-middle");
    
    // Append table body cells
    tbdoyRow.selectAll("td")
        .data((d,i) => Object.entries(d).map(([key, value]) => ({
                    key: key,
                    value: value,
                    index: i
                })))
        .enter()
        .append("td")
        .attr("class", "border rounded text-center border-slate-300");
        

    tbdoyRow.selectAll("td")
        .filter((d) => d.key === "name")
        .attr("id", (d) => `feature-name-${d.index}`)
        .attr("width", "12%")
        .append((d) => drawFeatureName(d.value, d.index));

    tbdoyRow.selectAll("td")
        .filter((d) => d.key === "contribution")
        .attr("id", "feature-contribution")
        .attr("width", "44%")
        .append((d) => drawBarchart(d.value, d.index));

    tbdoyRow.selectAll("td")
        .filter((d) => d.key === "boxplot")
        .attr("id", "feature-boxplot")
        .attr("width", "44%")
        .append((d) => drawBoxplot(d.value, d.index));
}

const drawLegend = (type) => {
    const legend = document.createElement("div");
    legend.setAttribute("class", `legend-${type} m-auto`);
    const w = (type === "name") ? state.width * 0.15 : state.width * 0.4, h = state.width * 0.1, padding = 10;
    const legendSvg = d3.select(legend)
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "legend-svg");

    const legendG = legendSvg.append("g")
        .attr("class", "legend-g")
        .attr("id", `legend-g-${type}`);

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    legendG.append("text")
        .attr("class", "legend-text font-bold")
        .attr("x", padding)
        .attr("y", padding)
        .attr("dominant-baseline", "middle")
        .text(capitalizeFirstLetter(type));

    if (type !== "name") {
        const x = d3.scaleLinear()
            .domain(type === "contribution" ? [state.contributionMin, state.contributionMax] : [state.boxplotMin, state.boxplotMax])
            .range([padding, w - padding]);

        legendG.append("g")
            .attr("class", "legend-axis")
            .attr("id", `legend-axis-${type}`)
            .attr("transform", `translate(0, ${h})`)
            .call(d3.axisTop(x).ticks(5));
    }
    const triangle = d3.symbol().type(d3.symbolTriangle).size(50); // triangle symbol
        
    const sortClick = (event, node) => {
        if (!state.isSorted) {
            sortFeatureTableByContribution();
        } else {
            sortFeatureTableByName();
        }
    }
    // Draw a triangle for contribution legend
    legendG.append("path")
        .filter((d) => type === "contribution")
        .attr("class", "legend-triangle cursor-pointer")
        .attr("d", triangle)
        .attr("transform", `translate(${w - padding}, ${padding}) rotate(180)`)
        .on("click", sortClick);

    return legend;
}

const drawFeatureName = (featureName, featureId) => {
    // Create div element
    const featureNameDiv = document.createElement("div");
    featureNameDiv.setAttribute("class", "feature-name flex justify-center m-auto");
    const w = state.width * 0.15, h = state.width * 0.2, padding = 10;

    const mouseover = function(event) {
        d3.select(`svg#feature-name-svg-${featureId}`)
            .classed(state.highlightedFeatureClass, true);
            
    };

    const mouseout = (event) => {
        // Consider the case when the user just brushed the projection view
        if (props.exposedFeatureContributions.length && props.exposedFeatureContributions.map(e => e.featureId).includes(featureId)) {
            return;
        } else {
            d3.select(`svg#feature-name-svg-${featureId}`)
                .classed(state.highlightedFeatureClass, false);
        }
    };

    const featureClicked = function(event) {
        if (!state.selectedFeatures[featureName]) {
            d3.select(`svg#feature-name-svg-${featureId}`)
                .classed(state.selectedFeatureClass, true);
            state.selectedFeatures[featureName] = true;
        } else {
            d3.select(`svg#feature-name-svg-${featureId}`)
                .classed(state.selectedFeatureClass, false);
                state.selectedFeatures[featureName] = false;
        }
    };

    // Create svg element
    const featureNameSvg = d3.select(featureNameDiv)
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "feature-name-svg cursor-pointer")
        .attr("id", `feature-name-svg-${featureId}`)
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .on("click", featureClicked);
    // Create g element
    const featureNameG = featureNameSvg.append("g")
        .attr("class", "feature-name-g")
        .attr("id", `feature-name-g-${featureId}`);
    // Create text element
    featureNameG.append("text")
        .attr("class", "feature-name-text")
        .attr("x", w/2-padding)
        .attr("y", h/2)
        .attr("dominant-baseline", "middle")
        .text(featureName);

    return featureNameDiv;

}

const drawBarchart = (featureContributionData, featureId) => {
    // Create div element
    const barchart = document.createElement("div");
    barchart.setAttribute("class", "barchart flex justify-center m-auto");
    const w = state.width * 0.4, h = state.width * 0.2, padding = 10;
    // Create svg element
    const barchartSvg = d3.select(barchart)
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "barchart-svg")
        .attr("id", `barchart-svg-${featureId}`)
    // Create group element
    const cell = barchartSvg.append("g")
        .attr("class", `barchart-g-${featureId}`);
    const isZero = (curr) => curr === 0;
    // Create x scale
    const x = d3.scaleLinear()
        .domain([state.contributionMin, state.contributionMax])
        .range([padding, w - padding]);
    // Create y scale
    const y = d3.scaleBand()
        .domain(featureContributionData.map((d, i) => i))
        .range([padding, h - padding])
        .padding(0.4);
    if (!featureContributionData.every(isZero)) {
        

        const mouseover = function(event, d) {
            if (state.exposedFeatures.includes(featureId)) {
                d3.select(this)
                    .style("stroke", "black")
            }
            d3.select(this)
                .style("stroke-width", "2px");
            // Highlight the corresponding feature contribution on the X-axis
            d3.select("g#legend-g-contribution")
                .append("line")
                .attr("class", "highlighted-legend-line")
                .attr("x1", x(d))
                .attr("x2", x(d))
                .attr("y1", 4*padding)
                .attr("y2", h)
                .style("stroke", "black")
                .style("stroke-width", "2px")
                
                d3.select("g#legend-g-contribution")
                .append("text")
                    .attr("class", "highlighted-legend-text")
                    .attr("x", x(d))
                    .attr("y", 4*padding)
                    .text(d.toFixed(2))
                    .style("font-size", "16px");

        };

        const mouseout = function(event, d) {
            if (state.exposedFeatures.includes(featureId)) {
                d3.select(this)
                    .style("stroke", "none")
            }
            d3.select(this)
                .style("stroke-width", "1px");
            // Clear the highlighted legend line
            d3.select("line.highlighted-legend-line")
                .remove();
            d3.select("text.highlighted-legend-text")
                .remove();
        };

        // Render bar chart
        cell.selectAll("bars")
            .data(featureContributionData)
            .enter()
            .append("rect")
            .attr("class", "feature-bar")
            .attr("id", `feature-bar-${featureId}`)
            .attr("x", (d) => x(Math.min(0, d)))
            .attr("y", (d, i) => y(i))
            .attr('rx', 2)
            .attr('ry', 2)
            .attr("width", (d) => Math.abs(x(d) - x(0)))
            .attr("height", y.bandwidth())
            .style("fill", (d, i) => state.colorScale[i])
            .style("stroke", "#000")
            .style("stroke-width", "1px")
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);
    } else {
        cell.append("text")
            .attr("x", w / 2)
            .attr("y", h / 2 + padding / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .text("No data");
    }
    
    return barchart;
}


const drawBoxplot = (boxplotData, featureId) => {
    // Create SVG element
    const boxplot = document.createElement("div");
    boxplot.setAttribute("class", "boxplot flex justify-center m-auto");
    const w = state.width * 0.4, h = state.width * 0.2, padding = 10;

    const x = d3.scaleLinear()
        .domain([state.boxplotMin, state.boxplotMax])
        .range([padding, w - padding]);

    const y = d3.scaleBand()
        .domain(Array.from({length: boxplotData.length}, (v, i) => i))
        .range([padding, h - padding])
        .padding(0.4);
    
    const boxplotSvg = d3.select(boxplot).append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "boxplot-svg")
        .attr("id",`boxplot-svg-${featureId}`);

    const cell = boxplotSvg.append("g")
        .attr("class", `boxplot-g`)
        .attr("id", `boxplot-g-${featureId}`);

    // Show the x scale
    // cell.append("g")
    //     .attr("transform", `translate(0, ${h-padding})`)
    //     .call(d3.axisBottom(x));

    // Show the main vertical line
    cell.selectAll("vertLines")
        .data(boxplotData)
        .enter()
        .append("line")
            .attr("x1", (d) => x(d.min))
            .attr("x2", (d) => x(d.max))
            .attr("y1", (d, i) => y(i) + y.bandwidth() / 2)
            .attr("y2", (d, i) => y(i) + y.bandwidth() / 2)
            .attr("stroke", "black")
            .style("width", 60)
    
    // Draw rectangle for the main box
    cell.selectAll("boxes")
        .data(boxplotData)
        .enter()
        .append("rect")
            .attr("x", (d) => x(d.q1))
            .attr("y", (d, i) => y(i))
            .attr("height", y.bandwidth())
            .attr("width", (d) => x(d.q3)-x(d.q1))
            .attr("stroke", "black")
            .style("fill", (d, i) => state.colorScale[i])
            .style("opacity", 0.5)
    
    // Show the median
    cell.selectAll("medianLines")
        .data(boxplotData)
        .enter()
        .append("line")
            .attr("x1", (d) => x(d.median))
            .attr("x2", (d) => x(d.median))
            .attr("y1", (d, i) => y(i))
            .attr("y2", (d, i) => y(i) + y.bandwidth())
            .attr("stroke", "black")
            .style("width", 120);
    
    // Show the min and max
    cell.selectAll("minLines")
        .data(boxplotData)
        .enter()
        .append("line")
            .attr("x1", (d) => x(d.min))
            .attr("x2", (d) => x(d.min))
            .attr("y1", (d, i) => y(i) + y.bandwidth()*(1/4))
            .attr("y2", (d, i) => y(i) + y.bandwidth()*(3/4))
            .attr("stroke", "black")
            .style("width", 120);

    cell.selectAll("maxLines")
        .data(boxplotData)
        .enter()
        .append("line")
            .attr("x1", (d) => x(d.max))
            .attr("x2", (d) => x(d.max))
            .attr("y1", (d, i) => y(i) + y.bandwidth()*(1/4))
            .attr("y2", (d, i) => y(i) + y.bandwidth()*(3/4))
            .attr("stroke", "black")
            .style("width", 120);

    return boxplot;
}

const drawExposedFeatureContributions = (exposedFeatureContributions) => {
    // Clear the previous exposed bar charts
    d3.selectAll("g.exposed-barchart-g").remove();
    exposedFeatureContributions.forEach((exposedFeatureContribution) => {
        // Highlight selected feature names
        d3.selectAll(`svg#feature-name-svg-${exposedFeatureContribution.featureId}`)
            .classed(state.highlightedFeatureClass, true);

        // Change opacity of the feature bar and temporarily remove stroke
        d3.selectAll(`rect#feature-bar-${exposedFeatureContribution.featureId}`)
            .style("opacity", 0.6)
            .style("stroke", "none");

        // TODO: add effects on feature name and feature contribution bar chart
        const w = state.width * 0.4, h = state.width * 0.2, padding = 10;
        const barchartSvg = d3.selectAll(`svg#barchart-svg-${exposedFeatureContribution.featureId}`);
        const exposedBarChartCell = barchartSvg.append("g")
            .attr("class", "exposed-barchart-g");
    
        // Create x scale
        const x = d3.scaleLinear()
            .domain([state.contributionMin, state.contributionMax])
            .range([padding, w - padding]);
            
        // Create y scale
        const y = d3.scaleBand()
            .domain(exposedFeatureContribution.contribution.map((d, i) => i))
            .range([padding, h - padding])
            .padding(0.4);

        const mouseover = function(event, d) {
            d3.select(this)
                .style("stroke-width", "2px");
            // Highlight the corresponding feature contribution on the X-axis
            d3.select("g#legend-g-contribution")
                .append("line")
                .attr("class", "highlighted-legend-line")
                .attr("x1", x(d))
                .attr("x2", x(d))
                .attr("y1", 4*padding)
                .attr("y2", h)
                .style("stroke", "black")
                .style("stroke-width", "2px")
                
                d3.select("g#legend-g-contribution")
                .append("text")
                    .attr("class", "highlighted-legend-text")
                    .attr("x", x(d))
                    .attr("y", 4*padding)
                    .text(d.toFixed(2))
                    .style("font-size", "16px");

        };

        const mouseout = function(event, d) {
            d3.select(this)
                .style("stroke-width", "1px");
            // Clear the highlighted legend line
            d3.select("line.highlighted-legend-line")
                .remove();
            d3.select("text.highlighted-legend-text")
                .remove();
        };


        // Render exposed bar chart
        exposedBarChartCell.selectAll("exposed-bars")
            .data(exposedFeatureContribution.contribution)
            .enter()
            .append("rect")
            .attr("class", "exposed-feature-bar")
            .attr("x", (d) => x(Math.min(0, d)))
            .attr("y", (d, i) => y(i) + y.bandwidth()/4)
            .attr("width", (d) => Math.abs(x(d) - x(0)))
            .attr("height", y.bandwidth()/2)
            .style("fill", (d, i) => state.colorScale[i])
            .style("stroke", "black")
            .style("stroke-width", "1px")
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);

        // Color scale
        const colors = [
            ["#e0f3db", "#66c2a5"],
            ["#fee6ce", "#fc8d62"],
            ["#efedf5", "#8da0cb"]
        ];
        const myColor = colors.map((color) => d3.scaleSequential()
                    .interpolator(d3.interpolateHcl)
                    .domain([state.boxplotMin, state.boxplotMax])
                    .range([color[0], color[1]]));
                    
        const boxplotX = d3.scaleLinear()
            .domain([state.boxplotMin, state.boxplotMax])
            .range([padding, w - padding]);

        // Add individual points with jitter
        const jitterWidth = 6;
        const randomJitterWidth = () => (Math.random()-0.5)*jitterWidth;
        exposedFeatureContribution.datasets.forEach((dataset, i) => {
            d3.select(`g#boxplot-g-${exposedFeatureContribution.featureId}`)
                .selectAll(`.exposed-boxplot-points-${i}`)
                .data(dataset)
                .enter()
                .append("circle")
                    .attr("class", "exposed-boxplot-point")
                    .attr("cx", (d) => boxplotX(d))
                    .attr("cy", (d) => y(i) + (y.bandwidth() / 2) + randomJitterWidth())
                    .attr("r", 2)
                    .style("fill", (d) => myColor[i](d))
                    .attr("stroke", "black")
        });
    });
}

watch(() => props.featureTable, (newVal, oldVal) => {
    state.featureTable = newVal.slice();
    initFeatureTable();
});

watch(() => props.exposedFeatureContributions, (newVal, oldVal) => {
    if (_.isEqual(newVal, oldVal)) return;
    state.exposedFeatures = newVal.map((d) => d.featureId);
    // Reset feature name, feature contribution bar chart, and boxplot
    d3.selectAll(`svg.feature-name-svg`)
        .classed(state.highlightedFeatureClass, false);

    d3.selectAll(`rect.feature-bar`)
        .style("opacity", 1)
        .style("stroke", "black");

    d3.selectAll("circle.exposed-boxplot-point").remove();
    // Draw exposed feature contributions
    drawExposedFeatureContributions(newVal);
});

watch(() => state.selectedFeatures, (newVal, oldVal) => {
    emit("emitSelectedFeaturesChanged", newVal);
},
{
    immediate: false,
    deep: true
})

</script>
<style scoped>
</style>