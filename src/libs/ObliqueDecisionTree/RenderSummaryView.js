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
        .attr("class", "summary coefficients x-axis cursor-default")
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
    let coefficientDistribution = targetSelection.append("g")
        .attr("class", "summary coefficient-distribution")
        .attr("transform", `translate(${2*nodeRectRatio}, ${2*nodeRectRatio})`);
    // Append each class rect into coefficientDistribution svg group
    coefficientDistribution.selectAll("rect")
        .data(coefficientsData)
        .enter()
        .append("rect")
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
    coefficientDistribution.selectAll("text")
        .data(coefficientsData)
        .enter()
        .append("text")
            .attr("class", "summary coefficients-bar-text")
            .attr("x", (d) => - 0.5*(nodeRectWidth)+xBar(d.start)+0.5*(xBar(d.end)-xBar(d.start)))
            .attr("y", 0.25*(nodeRectWidth-2*nodeRectRatio)-0.75*nodeRectRatio)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text((d) => d.label);
}

/**
 * Draw feature coefficients distribution in the summary view (donut chart).
 * @date 2022-09-09
 * @param { * } targetSelection
 * @param { * } nodeData
 * @param { * } that
 */
export function drawCoefficientDonutChart(targetSelection, nodeData, that) {
    const { constants: { nodeRectWidth, nodeRectRatio, featureArr } } = that;
    // Compute coefficient weights of features in the oblique split
    const {featureIdx, split }  = nodeData.data;
    const coefficientsNames = featureIdx.map(idx => featureArr[idx]);
    const coefficientWeights = normalizeArr(featureIdx.map(idx => split[idx]));
    const radius = (0.5*(nodeRectWidth-2*nodeRectRatio)-nodeRectRatio)/2;
    const donutData = coefficientWeights.map((val, idx) => ({
        name: coefficientsNames[idx],
        weight: val,
        label: (val === d3.max(coefficientWeights)) ? "big" : "small",
    }));

    const color = d3.scaleOrdinal()
        .domain(coefficientsNames)
        .range(["#BBC2C2", "#777777"]);

    const pie = d3.pie()
        .sort(null)
        .value(d => d.weight);

    const pieData = pie(donutData);
    const bigArc = d3.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9),
        smallArc = d3.arc()
        .innerRadius(radius * 0.3)
        .outerRadius(radius * 0.8);

    let donutChartGroup = targetSelection.append("g")
        .attr("class", "summary donut-chart")
        .attr("transform", `translate(${0}, ${2*nodeRectRatio + radius})`);
    
    const tooltip = donutChartGroup.append("rect")
        .attr("class", "summary donut-chart-tooltip")
        .attr("rx", "3px")
        .attr("ry", "3px")
        .style("opacity", 0)
        .style("width", "90px")
        .style("height", "30px")
        .style("fill", "white")
        .style("stroke", "black")
        .style("stroke-width", "2px");

    
    const mouseover = function (event, node) {
        d3.select(this)
            .style("stroke", "black")
            .style("stroke-width", "2px");

        tooltip.style("opacity", 1);
        donutChartGroup.append("text")
            .attr("class", "summary donut-chart-tooltip-text")
            .text(`Weight: ${node.data.weight.toFixed(2)}`)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .style("fill", "black");
    }

    const mousemove = function (event, node) {
        tooltip
            .attr("x", (d3.pointer(event)[0])+40)
            .attr("y", (d3.pointer(event)[1]+25));
            donutChartGroup.select("text.donut-chart-tooltip-text")
            .attr("x", (d3.pointer(event)[0])+80)
            .attr("y", (d3.pointer(event)[1]+45));
    }

    const mouseout = function (event, node) {
        tooltip.style("opacity", 0);
        donutChartGroup.select("text.donut-chart-tooltip-text").remove();
        if (that.selectedFeatureNames.includes(node.data.name)) {
            return;
        } else {
            d3.select(this)
                .style("stroke", "none");
        }
    }

    // Build the donut chart
    donutChartGroup.selectAll("coefficients-donut-chart")
        .data(pieData)
        .join("path")
        .attr("class", "summary coefficients-donut-chart")
        .attr("id", (d, i) => `donut-chart-${d.data.name}`)
        .attr("d", (d, i) => smallArc(d))
        .style("fill", d => color(d.data.name))
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseout", mouseout);

    // Add the polylines between chart and labels
    donutChartGroup.selectAll("coefficients-polylines")
        .data(pieData)
        .join("polyline")
            .attr("stroke", "black")
            .style("fill", "none")
            .attr("stroke-width", 1)
            .attr("points", (d) => {
                const posA = smallArc.centroid(d) // line insertion in the slice
                const posB = bigArc.centroid(d) // line break: we use the other arc generator that has been built only for that
                const posC = bigArc.centroid(d); // Label position = almost the same as posB
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2 // we need the angle to see if the X position will be at the extreme right or extreme left
                posC[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1); // multiply by 1 or -1 to put it on the right or on the left
                return [posA, posB, posC];
            })

    // Add feature names beside the polyline
    donutChartGroup.selectAll("coefficients-donut-chart-labels")
        .data(pieData)
        .join('text')
            .text(d => d.data.name)
            .attr("class", "summary donut-chart-label cursor-default")
            .attr("id", (d, i) => `donut-chart-label-${d.data.name}`)
            .attr('transform', (d) => {
                const pos = bigArc.centroid(d);
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
                pos[0] = radius * 0.99 * (midangle < Math.PI ? 1 : -1);
                return `translate(${pos})`;
            })
            .style('text-anchor', (d) => {
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2
                return (midangle < Math.PI ? 'start' : 'end')
            })
            .style("fill", "black")
            .style("font-size", "16px");
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
    const splitDistribution = targetSelection.append("g")
            .attr("class", "summary split-distribution cursor-default")
            .attr("transform", `translate(${nodeRectRatio},${nodeRectRatio})`);

    // Append left and right split distribution into splitDistribution svg group
    splitDistribution.selectAll("rect.positive")
        .data(splitData)
        .enter()
        .append("rect")
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

    splitDistribution.selectAll("rect.negative")
        .data(splitData)
        .enter()
        .append("rect")
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
    splitDistribution.selectAll("text.positive")
        .data(splitData)
        .enter()
        .append("text")
            .attr("class", "summary split-text")
            .text( (d) => d[1])
            .attr("text-anchor", "start")
            .attr("font-size", "10px")
            .attr("fill", "black")
            .attr("transform", (d, i) => {
                return `translate(${-nodeRectRatio+xRight(d[1])+5},
                    ${5+0.5*yBand.bandwidth()+yBand(i)+0.5*(nodeRectWidth-2*nodeRectRatio)})`;
            })

    splitDistribution.selectAll("text.negative")
        .data(splitData)
        .enter()
        .append("text")
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

    // Append tooltip text along with the tooltip rectangle
    const mouseover = function(event, d) {
        tooltip.style("opacity", 1);
            
        splitDistribution.append("text")
            .attr("class", "tooltip-text")
            .text(`Count: ${d.count}`)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .style("fill", "black");
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1);
    }
    
    // Update tooltip position
    const mousemove = function(event, d) {
        tooltip
            .attr("x", (d3.pointer(event)[0])+40)
            .attr("y", (d3.pointer(event)[1]+25));
        splitDistribution.select("text")
            .attr("x", (d3.pointer(event)[0])+80)
            .attr("y", (d3.pointer(event)[1]+45));
    }
    // Clear tooltip text    
    const mouseout = function(d) {
        tooltip.style("opacity", 0);
        splitDistribution.select("text").remove();
        d3.select(this)
            .style("opacity", 0.8);
    }
    
    const splitDataLeft = exposedNodeData.data.leftCount.map((val, idx) => ({
        count: val,
        label: idx
    }));

    const splitDataRight = exposedNodeData.data.rightCount.map((val, idx) => ({
        count: val,
        label: idx
    }));
    const splitDistribution = targetSelection.append("g")
        .attr("class", "summary exposed-split-distribution")
        .attr("transform", `translate(${nodeRectRatio},${nodeRectRatio})`);

    // Append tooltip rect to splitDistribution svg group
    const tooltip = splitDistribution.append("rect")
        .attr("class", "tooltip")
            .attr("rx", "3px")
            .attr("ry", "3px")
            .style("opacity", 0)
            .style("width", "80px")
            .style("height", "30px")
            .style("fill", "white")
            .style("stroke", "black")
            .style("stroke-width", "2px");

    // Append left and right split distribution into splitDistribution svg group
    splitDistribution.selectAll(`rect-right#${originalNodeData.name}`)
        .data(splitDataRight)
        .enter()
        .append("rect")
            .attr("class", "summary exposed-split-rect")
            .attr("id", `${originalNodeData.name}`)
            .attr("width", (d) => {
                return xRight(d.count);
            })
            .attr("height", yBand.bandwidth())
            .attr("x", - nodeRectRatio)
            .attr("y", (d) => yBand(d.label)+0.5*(nodeRectWidth-2*nodeRectRatio))
            .attr("fill", (d) => {
                const texture = textures.lines()
                    .size(8)
                    .strokeWidth(2)
                    .stroke("#000")
                    .background(colorScale[d.label]);
                splitDistribution.call(texture);
                return texture.url();
            })
            .style("stroke", "#000")
            .style("stroke-width", "2px")
            .style("opacity", 0.8)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseout", mouseout)

    splitDistribution.selectAll(`rect-left#${originalNodeData.name}`)
        .data(splitDataLeft)
        .enter()
        .append("rect")
            .attr("class", "summary exposed-split-rect")
            .attr("id", `${originalNodeData.name}`)
            .attr("width", (d) => {
                return 0.5*(nodeRectWidth-2*nodeRectRatio)-xLeft(d.count);
            })
            .attr("height", yBand.bandwidth())
            .attr("x", (d) => -0.5*nodeRectWidth+xLeft(d.count))
            .attr("y", (d) => yBand(d.label)+0.5*(nodeRectWidth-2*nodeRectRatio))
            .attr("fill", (d) => {
                const texture = textures.lines()
                    .size(8)
                    .strokeWidth(2)
                    .stroke("#000")
                    .background(colorScale[d.label]);
                splitDistribution.call(texture);
                return texture.url();
            })
            .style("stroke", "#000")
            .style("stroke-width", "2px")
            .style("opacity", 0.8)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseout", mouseout);

}