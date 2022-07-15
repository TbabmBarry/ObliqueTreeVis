import * as d3 from 'd3';
import _ from 'lodash';
import textures from 'textures';
import { normalizeArr } from '@/libs/ObliqueDecisionTree/Utils';

/**
 * Draw class distribution in the summary view.
 * @date 2022-07-11
 * @param {targetSelection} targetSelection
 * @param {nodeData} nodeData
 * @param {that} that
 */
export function drawClassDistribution(targetSelection, nodeData, that) {
    const { constants: { nodeRectWidth, nodeRectRatio, colorScale } } = that;
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
    let classDistribution = targetSelection.append("g")
        .attr("class", "summary class-distribution")
        .attr("transform", `translate(${nodeRectRatio}, ${nodeRectRatio})`);
    classDistribution.selectAll("rect")
        .data(classData)
        .enter()
        .append("rect")
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
export function drawCoefficientDistribution(targetSelection, nodeData, nodeRectWidth, nodeRectRatio, featureArr, featureColorScale) {
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
        .selectAll("text");
}

/**
 * Draw feature coefficients distribution in the summary view (horizontal bar).
 * @date 2022-07-11
 * @param {targetSelection} targetSelection
 * @param {nodeData} nodeData
 * @param {that} that
 */
export function drawCoefficientBar(targetSelection, nodeData, that) {
    const { constants: { nodeRectWidth, nodeRectRatio, featureArr, featureColorScale } } = that;
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
 * Draw split point distribution in the summary view.
 * @date 2022-07-11
 * @param {targetSelection} targetSelection
 * @param {nodeData} nodeData
 * @param {that} that
 */
export function drawSplitHistogram(targetSelection, nodeData, that) {
    const { constants: { nodeRectWidth, nodeRectRatio, colorScale } } = that;
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
 * @date 2022-07-11
 * @param {targetSelection} targetSelection
 * @param {originalNodeData} originalNodeData
 * @param {exposedNodeData} exposedNodeData
 * @param {that} that
 */
export function drawExposedSplitHistogram(targetSelection, originalNodeData, exposedNodeData, that) {
    const { constants: { nodeRectWidth, nodeRectRatio, colorScale } } = that;
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