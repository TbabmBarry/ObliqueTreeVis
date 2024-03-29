import * as d3 from 'd3';
import _ from 'lodash';
import textures from 'textures';
import { getEndSplitPoint, dodge } from '@/libs/ObliqueDecisionTree/Utils';

/**
 * Draw two-feature scatter plot in each decision node
 * @date 2022-07-11
 * @param {targetSelection} targetSelection
 * @param {nodeData} nodeData
 * @param {currFeatureIdx} currFeatureIdx
 * @param {x} x
 * @param {y} y
 * @param {that} that
 */
export function drawScatterPlot(targetSelection, nodeData, currFeatureIdx, x, y, that) {
    const { parts, trainX, trainY, registeredStateListeners, scale, constants : { nodeRectWidth, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, featureArr, colorScale }} = that;
    
    // Allow X and Y axis generators to be called
    targetSelection.append("g")
        .attr("class", "detailed x-axis cursor-default")
        .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+detailedViewNodeRectWidth-2*scatterPlotPadding})`)
        .call(d3.axisBottom(x[currFeatureIdx[0]]))
        .call(g => g.append("text")
            .attr("class", "axis-label cursor-default")
            .attr("x", detailedViewNodeRectWidth-histogramHeight-histogramScatterPlotPadding)
            .attr("y", 1.5*scatterPlotPadding)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .style("font-size", "16px")
            .text(`${featureArr[currFeatureIdx[0]]} →`)
        );
    targetSelection.append("g")
        .attr("class", "detailed y-axis cursor-default")
        .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding})`)
        .call(d3.axisLeft(y[currFeatureIdx[1]]))
        .call(g => g.append("text")
            .attr("class", "axis-label cursor-default")
            .attr("x", 2*scatterPlotPadding)
            .attr("y", 1.5*scatterPlotPadding)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .style("font-size", "16px")
            .attr("transform", "rotate(90)")
            .text(`← ${featureArr[currFeatureIdx[1]]}`)
        );

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
    const brushCellPadding = 20;
    targetSelection.append("rect")
            .attr("class", "detailed brushable-rect")
            .attr("id", d => `detailed-brushable-rect-${d.data.name}`)
            .attr("fill", "transparent")
            .attr("stroke", "none")
            .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding-0.5*brushCellPadding},
                ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding-0.5*brushCellPadding})`)
            .attr("width", detailedViewNodeRectWidth-3*scatterPlotPadding-histogramHeight-histogramScatterPlotPadding+brushCellPadding)
            .attr("height", detailedViewNodeRectWidth-3*scatterPlotPadding-histogramHeight-histogramScatterPlotPadding+brushCellPadding);

    const circle = targetSelection.selectAll("circle")
        .data(nodeData.data.subTrainingSet)
        .enter()
        .append("circle")
            .attr("class", "detailed dot")
            .attr("id", d => `dot-${d}`)
            .attr("cx", (d) => {
                return x[currFeatureIdx[0]](trainX[d][featureArr[currFeatureIdx[0]]])
                    -0.5*detailedViewNodeRectWidth+2*scatterPlotPadding;
            })
            .attr("cy", (d) => {
                return y[currFeatureIdx[1]](trainX[d][featureArr[currFeatureIdx[1]]])
                    -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding;
            })
            .attr("r", 3.5)
            .style("fill", (d) => {
                if (that.selectedPoints.length && !that.selectedPoints.includes(d)) {
                    return "#fff";
                } else {
                    return colorScale[trainY[d]];
                }
            })
            .style("stroke", (d) => colorScale[trainY[d]]);

        const doc = d3.select(document);
        const zoomListener = registeredStateListeners[0];
        doc.on("keydown", (event, d) => {
            if (event.key === "Alt") {
                parts.baseSvg.on(".zoom", null);
                targetSelection.call(brush, circle, x[currFeatureIdx[0]], y[currFeatureIdx[1]]);
            }
        })
        doc.on("keyup", (event, d) => {
            if (event.key === "Alt") {
                // Remove selection of the detailed view
                const brushEvent = brush(targetSelection, circle, x[currFeatureIdx[0]], y[currFeatureIdx[1]]);
                // Remove the brush
                targetSelection.call(brushEvent.move, null);
                targetSelection.selectAll(".overlay").remove();
                targetSelection.selectAll(".selection").remove();
                targetSelection.selectAll(".handle").remove();
                // Re-enable zoom
                parts.baseSvg.call(zoomListener);
            }
        })
        
    function brush (cell, circle, x, y) {
        const brush = d3.brush()
            .extent([[-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding-0.5*brushCellPadding,
                    -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding-0.5*brushCellPadding], 
                    [0.5*detailedViewNodeRectWidth-scatterPlotPadding-histogramHeight-histogramScatterPlotPadding+0.5*brushCellPadding,
                        0.5*(detailedViewNodeRectWidth+nodeRectWidth)-2*scatterPlotPadding+0.5*brushCellPadding]]
            )
            .on("start", brushStarted)
            .on("brush", brushed)
            .on("end", brushEnded);
        
        cell.call(brush);

        let brushCell;
        function brushStarted() {
            if (brushCell !== this) {
                d3.select(brushCell).call(brush.move, null);
                brushCell = this;
            }
        }
        
        function brushed ({ selection }) {
            let selected = [];
            if (selection) {
                const [[x0, y0], [x1, y1]] = selection;
                circle.classed("unselected", (d) => 
                    (x0+0.5*detailedViewNodeRectWidth-2*scatterPlotPadding) > x(trainX[d][featureArr[currFeatureIdx[0]]]) 
                    || (x1+0.5*detailedViewNodeRectWidth-2*scatterPlotPadding) < x(trainX[d][featureArr[currFeatureIdx[0]]]) 
                    || (y0+0.5*(detailedViewNodeRectWidth-nodeRectWidth)-histogramHeight-scatterPlotPadding-histogramScatterPlotPadding) > y(trainX[d][featureArr[currFeatureIdx[1]]]) 
                    || (y1+0.5*(detailedViewNodeRectWidth-nodeRectWidth)-histogramHeight-scatterPlotPadding-histogramScatterPlotPadding) < y(trainX[d][featureArr[currFeatureIdx[1]]]));

                selected = nodeData.data.subTrainingSet.filter((d) => 
                    (x0+0.5*detailedViewNodeRectWidth-2*scatterPlotPadding) <= x(trainX[d][featureArr[currFeatureIdx[0]]]) 
                    && (x1+0.5*detailedViewNodeRectWidth-2*scatterPlotPadding) >= x(trainX[d][featureArr[currFeatureIdx[0]]]) 
                    && (y0+0.5*(detailedViewNodeRectWidth-nodeRectWidth)-histogramHeight-scatterPlotPadding-histogramScatterPlotPadding) <= y(trainX[d][featureArr[currFeatureIdx[1]]]) 
                    && (y1+0.5*(detailedViewNodeRectWidth-nodeRectWidth)-histogramHeight-scatterPlotPadding-histogramScatterPlotPadding) >= y(trainX[d][featureArr[currFeatureIdx[1]]]));
            }
            // Process and update the selected  points
            selected = selected.map((id) => ({
                id,
                label: trainY[id],
            }));
            parts.baseSvg.property("selectedPointsInDetailedView", selected).dispatch("emitSelectedPointsInDetailedView");
        }

        function brushEnded ({ selection }) {
            if (selection) return;
            // Reset the unselected points to their original style
            parts.baseSvg.property("selectedPointsInDetailedView", []).dispatch("emitSelectedPointsInDetailedView");
            circle.classed("unselected", false);
            // Remove brush event listener
        }
        return brush;
    }
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
export function drawStripChart(targetSelection, nodeData, nodeRectWidth, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, featureArr, featureColorScale, currFeatureIdx, that) {
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
 * Draw beeswarm plot for one-feature decision node in detailed view.
 * @date 2022-07-11
 * @param {targetSelection} targetSelection
 * @param {nodeData} nodeData
 * @param {currFeatureIdx} currFeatureIdx
 * @param {that} that
 */
export function drawBeeswarm(targetSelection, nodeData, currFeatureIdx, that) {
    const { trainX, trainY, 
        constants: { featureArr, nodeRectWidth, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, colorScale, featureColorScale } } = that;
    const X = nodeData.data.subTrainingSet.map(idx => ({
        value: trainX[idx][featureArr[currFeatureIdx[0]]],
        index: idx,
        label: trainY[idx],
    }));
    const xScale = d3.scaleLinear()
        .domain(d3.extent(X, d => d.value))
        .range([0, detailedViewNodeRectWidth-3*scatterPlotPadding]);
    const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);
    
    const radius = 3, padding = 1.5;
    const marginTop = scatterPlotPadding+histogramHeight+histogramScatterPlotPadding;
    const marginBottom = 0.5*detailedViewNodeRectWidth+2*scatterPlotPadding;
    const Y = dodge(X.map(x => xScale(x.value)), radius*2+padding);
    const beeswarmHeight = d3.max(Y)+(radius+padding)*2+marginTop+marginBottom;

    // Draw X-axis for beeswarm plot
    targetSelection.append("g")
        .attr("class", "detailed beeswarm x-axis")
        .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}
            ,${beeswarmHeight-marginBottom})`)
        .call(xAxis)
        .call(g => g.append("text")
            .attr("x", detailedViewNodeRectWidth-3*scatterPlotPadding)
            .attr("y", -0.5*detailedViewNodeRectWidth+marginBottom-4)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .text(`${featureArr[currFeatureIdx[0]]} →`)
        );
    
    // Draw points for beeswarm plot
    targetSelection.append("g")
        .attr("class", "detailed beeswarm-chart-group")
    .selectAll("circle")
    .data(X)
    .join("circle")
    .attr("class", "detailed dot")
    .attr("id", d => `dot-${d.index}`)
        .attr("r", radius)
        .attr("cx", d => xScale(d.value)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding)
        .attr("cy", (d, i) => beeswarmHeight - marginBottom - radius - padding - Y[i])
        .style("fill", (d) => {
            if (that.selectedPoints.length && !that.selectedPoints.includes(d.index)) {
                return "#fff";
            } else {
                return colorScale[d.label];
            }
        })
        .style("stroke", (d) => colorScale[d.label]);

    // Draw feature histogram for beeswarm plot
    // Set up histogram parameters
    const beeswarmHistogram = d3.bin()
        .value((d) => d.value)
        .domain(xScale.domain())
        .thresholds(xScale.ticks(20));

    // Get the original data for histograms
    const valuesLeft = nodeData.data.leftSubTrainingSet.map(idx => ({
        value: trainX[idx][featureArr[currFeatureIdx[0]]],
        label: trainY[idx],
    })),
        valuesRight = nodeData.data.rightSubTrainingSet.map(idx => ({
            value: trainX[idx][featureArr[currFeatureIdx[0]]],
            label: trainY[idx],
        }));

    // Get the histogram data according to predefined histogram functions
    const binsLeft = beeswarmHistogram(valuesLeft),
        binsRight = beeswarmHistogram(valuesRight);

    // Set up y-axis value encodings for histograms
    const yHistogram = d3.scaleLinear()
        .domain([0, Math.max(d3.max(binsLeft, d => d.length), d3.max(binsRight, d => d.length))])
        .range([histogramHeight, 0]);

    // Draw histograms
    targetSelection.selectAll("rect.histogram.x-histogram.left")
        .data(binsLeft)
        .join("rect")
        .attr("class", "detailed histogram")
        .attr("y", d => yHistogram(d.length))
        .attr("transform", d => `translate(${xScale(d.x0)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+scatterPlotPadding})`)
        .attr("width", d => xScale(d.x1)-xScale(d.x0))
        .attr("height", d => histogramHeight-yHistogram(d.length))
        .attr("fill", featureColorScale(featureArr[currFeatureIdx[0]]))
        .style("opacity", 0.4);

    targetSelection.selectAll("rect.histogram.x-histogram.right")
        .data(binsRight)
        .join("rect")
        .attr("class", "detailed histogram")
        .attr("y", d => yHistogram(d.length))
        .attr("transform", d => `translate(${xScale(d.x0)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+scatterPlotPadding})`)
            .attr("width", d => xScale(d.x1)-xScale(d.x0))
            .attr("height", d => histogramHeight-yHistogram(d.length))
        .attr("fill", featureColorScale(featureArr[currFeatureIdx[0]]))
        .style("opacity", 0.6);

    // Draw x-axis for histogram
    targetSelection.append("g")
        .attr("class", "detailed histogram x-axis")
        .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding},
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding})`)
        .call(d3.axisBottom(xScale).tickFormat(""));
}
 
/**
 * Draw stacked feature histogram for one-feature decision node in detailed view.
 * @date 2022-09-08
 * @param { * } targetSelection
 * @param { * } nodeData
 * @param { * } currFeatureIdx
 * @param { * } that
 */
export function drawOneFeatureHistogram(targetSelection, nodeData, currFeatureIdx, that) {
    const { trainX, trainY, 
        constants: { featureArr, nodeRectWidth, detailedViewNodeRectWidth, 
            scatterPlotPadding, colorScale } } = that;
    
    // Set up histogram parameters
    const X = nodeData.data.subTrainingSet.map(idx => ({
        value: trainX[idx][featureArr[currFeatureIdx[0]]],
        index: idx,
        label: trainY[idx],
    }));
    // Get split point value
    const splitPoint = -1*nodeData.data.split[nodeData.data.split.length-1];
    const xRange = d3.extent(X, d => d.value);
    if (splitPoint < xRange[0]) xRange[0] = splitPoint;
    if (splitPoint > xRange[1]) xRange[1] = splitPoint;
    const xScale = d3.scaleLinear()
        .domain(xRange)
        .range([0, detailedViewNodeRectWidth-8*scatterPlotPadding]);

    const oneFeatureHistogram = d3.bin()
        .value((d) => d.value)
        .domain(xScale.domain())
        .thresholds(xScale.ticks(20));

    const xAxis = d3.axisBottom(xScale).tickSizeOuter(0);

    // Get the original data for histograms
    const valuesLeft = nodeData.data.leftSubTrainingSet.map(idx => ({
        value: trainX[idx][featureArr[currFeatureIdx[0]]],
        label: trainY[idx],
    })),
        valuesRight = nodeData.data.rightSubTrainingSet.map(idx => ({
            value: trainX[idx][featureArr[currFeatureIdx[0]]],
            label: trainY[idx],
        }));

    // Get the histogram data according to pre-defined histogram functions
    const binsLeft = oneFeatureHistogram(valuesLeft),
        binsRight = oneFeatureHistogram(valuesRight);

    const stackLeft = stackDataGenerator(binsLeft),
        stackRight = stackDataGenerator(binsRight);

    const triangle = d3.symbol().type(d3.symbolTriangle).size(50); // triangle symbol

    // Set up y-axis value encodings for histograms
    const yHistogram = d3.scaleLinear()
        .domain([0, Math.max(d3.max(binsLeft, d => d.length), d3.max(binsRight, d => d.length))])
        .range([detailedViewNodeRectWidth-8*scatterPlotPadding, 0]);

    // Draw stacked histograms
    targetSelection.append("g")
        .selectAll("g.histogram.x-histogram.left")
        .data(stackLeft)
        .join("g")
            .attr("fill", (d,i) => colorScale[i])    
        .selectAll("rect.histogram.x-histogram.left")
        .data(d => d)
        .join("rect")
        .attr("class", "detailed histogram")
        .attr("y", d => Math.min(yHistogram(d[1]), yHistogram(d[0])))
        .attr("transform", d => `translate(${xScale(d.data.x0)-0.5*detailedViewNodeRectWidth+4*scatterPlotPadding}, 
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+4*scatterPlotPadding})`)
        .attr("width", d => xScale(d.data.x1)-xScale(d.data.x0))
        .attr("height", d => Math.abs(yHistogram(d[0])-yHistogram(d[1])));

    targetSelection.append("g")
        .selectAll("g.histogram.x-histogram.right")
        .data(stackRight)
        .join("g")
            .attr("fill", (d,i) => colorScale[i])    
        .selectAll("rect.histogram.x-histogram.right")
        .data(d => d)
        .join("rect")
        .attr("class", "detailed histogram")
        .attr("y", d => Math.min(yHistogram(d[1]), yHistogram(d[0])))
        .attr("transform", d => `translate(${xScale(d.data.x0)-0.5*detailedViewNodeRectWidth+4*scatterPlotPadding}, 
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+4*scatterPlotPadding})`)
            .attr("width", d => xScale(d.data.x1)-xScale(d.data.x0))
            .attr("height", d => Math.abs(yHistogram(d[0])-yHistogram(d[1])));

    // Draw x-axis for histogram
    targetSelection.append("g")
        .attr("class", "detailed histogram x-axis cursor-default")
        .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+4*scatterPlotPadding},
            ${0.5*(detailedViewNodeRectWidth+nodeRectWidth)-4*scatterPlotPadding})`)
        .call(xAxis)
        .call(g => g.append("text")
            .attr("class", "detailed histogram x-axis-label cursor-default")
            .attr("x", 0.5*(detailedViewNodeRectWidth+nodeRectWidth+2*scatterPlotPadding))
            .attr("y", 2*scatterPlotPadding)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .style("font-size", "16px")
            .text(`${featureArr[currFeatureIdx[0]]} →`)
        );

    // Draw y-axis for histogram
    targetSelection.append("g")
        .attr("class", "detailed histogram y-axis cursor-default")
        .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+4*scatterPlotPadding},
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+4*scatterPlotPadding})`)
        .call(d3.axisLeft(yHistogram).ticks(5).tickFormat((e) => {
            if(Math.floor(e) != e) return;
            return e;
        }))
        .call(g => g.append("text")
            .attr("class", "detailed histogram y-axis-label cursor-default")
            .attr("x", 2*scatterPlotPadding)
            .attr("y", 1.5*scatterPlotPadding)
            .attr("fill", "currentColor")
            .attr("text-anchor", "end")
            .style("font-size", "16px")
            .attr("transform", "rotate(90)")
            .text(`← Count`)
        );

    // Draw split point triangle
    targetSelection.append("path")
        .attr("class", "detailed histogram split-point-triangle")
        .attr("d", triangle)
        .attr("transform", `translate(${xScale(splitPoint)-0.5*detailedViewNodeRectWidth+4*scatterPlotPadding},
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+detailedViewNodeRectWidth-3*scatterPlotPadding})`)
        .style("fill", "#000");
    // Draw split point line
    targetSelection.append("line")
        .attr("class", "detailed histogram split-point-line")
        .attr("x1", xScale(splitPoint)-0.5*detailedViewNodeRectWidth+4*scatterPlotPadding)
        .attr("x2", xScale(splitPoint)-0.5*detailedViewNodeRectWidth+4*scatterPlotPadding)
        .attr("y1", -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+detailedViewNodeRectWidth-4*scatterPlotPadding)
        .attr("y2", -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+4*scatterPlotPadding)
        .style("stroke", "#000")
        .style("stroke-width", 3);
}

/**
 * Draw feature distribution in detailed view.
 * @date 2022-07-11
 * @param {targetSelection} targetSelection
 * @param {nodeData} nodeData
 * @param {currFeatureIdx} currFeatureIdx
 * @param {x} x
 * @param {y} y
 * @param {that} that
 */
export function drawFeatureHistogram(targetSelection, nodeData, currFeatureIdx, x, y, that) {
    const { trainX, trainY, constants : { featureArr, nodeRectWidth, nodeRectRatio, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, colorScale }} = that;
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
        value: trainX[idx][featureArr[currFeatureIdx[0]]],
        label: trainY[idx],
    })),
        values1Right = nodeData.data.rightSubTrainingSet.map(idx => ({
            value: trainX[idx][featureArr[currFeatureIdx[0]]],
            label: trainY[idx],
        })),
        values2Left = nodeData.data.leftSubTrainingSet.map(idx => ({
            value: trainX[idx][featureArr[currFeatureIdx[1]]],
            label: trainY[idx],
        })),
        values2Right = nodeData.data.rightSubTrainingSet.map(idx => ({
            value: trainX[idx][featureArr[currFeatureIdx[1]]],
            label: trainY[idx],
        }));
    // Get the histogram data according to predefined histogram functions
    const bins1Left = histogram1(values1Left),
        bins1Right = histogram1(values1Right),
        bins2Left = histogram2(values2Left),
        bins2Right = histogram2(values2Right);
    
    const stack1Left = stackDataGenerator(bins1Left),
        stack1Right = stackDataGenerator(bins1Right),
        stack2Left = stackDataGenerator(bins2Left),
        stack2Right = stackDataGenerator(bins2Right);
        
    // Set up y-axis value encodings for histograms
    const yHistogram1 = d3.scaleLinear()
            .domain([0, Math.max(d3.max(bins1Left, d => d.length), d3.max(bins1Right, d => d.length))])
            .range([histogramHeight, 0]),
        yHistogram2 = d3.scaleLinear()
            .domain([0, Math.max(d3.max(bins2Left, d => d.length), d3.max(bins2Right, d => d.length))])
            .range([0, histogramHeight]);
    // Draw histograms
    targetSelection.append("g")
        .selectAll("g.histogram.x-histogram.left")
        .data(stack1Left)
        .join("g")
            .attr("fill", (d,i) => colorScale[i])    
        .selectAll("rect.histogram.x-histogram.left")
        .data(d => d)
        .join("rect")
        .attr("class", "detailed histogram")
        .attr("y", d => Math.min(yHistogram1(d[1]), yHistogram1(d[0])))
        .attr("transform", d => `translate(${x[currFeatureIdx[0]](d.data.x0)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+scatterPlotPadding})`)
        .attr("width", d => x[currFeatureIdx[0]](d.data.x1)-x[currFeatureIdx[0]](d.data.x0))
        .attr("height", d => Math.abs(yHistogram1(d[0])-yHistogram1(d[1])))
        .style("opacity", 0.6);

    targetSelection.append("g")
        .selectAll("g.histogram.x-histogram.right")
        .data(stack1Right)
        .join("g")
            .attr("fill", (d,i) => colorScale[i])    
        .selectAll("rect.histogram.x-histogram.right")
        .data(d => d)
        .join("rect")
        .attr("class", "detailed histogram")
        .attr("y", d => Math.min(yHistogram1(d[1]), yHistogram1(d[0])))
        .attr("transform", d => `translate(${x[currFeatureIdx[0]](d.data.x0)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}, 
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+scatterPlotPadding})`)
            .attr("width", d => x[currFeatureIdx[0]](d.data.x1)-x[currFeatureIdx[0]](d.data.x0))
            .attr("height", d => Math.abs(yHistogram1(d[0])-yHistogram1(d[1])))
        .style("opacity", 0.6);

    // Draw axis for histogram on the first feature
    targetSelection.append("g")
        .attr("class", "detailed histogram axis-left")
        .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding},
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding})`)
        .call(d3.axisBottom(x[currFeatureIdx[0]]).tickFormat(""));
    
    targetSelection.append("g")
        .selectAll("g.histogram.y-histogram.left")
        .data(stack2Left)
        .join("g")
            .attr("fill", (d,i) => colorScale[i])    
        .selectAll("rect.histogram.y-histogram.left")
        .data(d => d)
        .join("rect")
        .attr("class", "detailed histogram")
        .attr("y", -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+histogramScatterPlotPadding+scatterPlotPadding)
        .attr("transform", d => `translate(${0.5*detailedViewNodeRectWidth-scatterPlotPadding-histogramHeight+yHistogram2(d[0])}, 
            ${y[currFeatureIdx[1]](d.data.x1)})`)
        .attr("width", d => Math.abs(yHistogram2(d[0])-yHistogram2(d[1])))
        .attr("height", d => -y[currFeatureIdx[1]](d.data.x1)+y[currFeatureIdx[1]](d.data.x0))
        .style("opacity", 0.6);
    
    targetSelection.append("g")
        .selectAll("g.histogram.y-histogram.right")
        .data(stack2Right)
        .join("g")
            .attr("fill", (d,i) => colorScale[i])
        .selectAll("rect.histogram.y-histogram.right")
        .data(d => d)
        .join("rect")
        .attr("class", "detailed histogram")
        .attr("y", -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+histogramScatterPlotPadding+scatterPlotPadding)
        .attr("transform", d => `translate(${0.5*detailedViewNodeRectWidth-scatterPlotPadding-histogramHeight+yHistogram2(d[0])}, 
            ${y[currFeatureIdx[1]](d.data.x1)})`)
        .attr("width", d => Math.abs(yHistogram2(d[0])-yHistogram2(d[1])))
        .attr("height", d => -y[currFeatureIdx[1]](d.data.x1)+y[currFeatureIdx[1]](d.data.x0))
        .style("opacity", 0.6);

     // Draw axis for histogram on the second feature
     targetSelection.append("g")
        .attr("class", "detailed histogram axis-right")
        .attr("transform", `translate(${0.5*detailedViewNodeRectWidth-scatterPlotPadding-histogramHeight},
            ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding+histogramScatterPlotPadding})`)
        .call(d3.axisLeft(y[currFeatureIdx[1]]).tickFormat(""));
}

export function drawTwoFeatureBeeswarm(targetSelection, nodeData, currFeatureIdx, that) {
    const { trainX, trainY, 
        constants: { featureArr, nodeRectWidth, detailedViewNodeRectWidth, histogramHeight, scatterPlotPadding, histogramScatterPlotPadding, colorScale, featureColorScale } } = that;
        const X1 = nodeData.data.subTrainingSet.map(idx => ({
            value: trainX[idx][featureArr[currFeatureIdx[0]]],
            index: idx,
            label: trainY[idx],
        })),
        X2 = nodeData.data.subTrainingSet.map(idx => ({
            value: trainX[idx][featureArr[currFeatureIdx[1]]],
            index: idx,
            label: trainY[idx],
        }));
        const xScale1 = d3.scaleLinear()
            .domain(d3.extent(X1, d => d.value))
            .range([0, detailedViewNodeRectWidth-3*scatterPlotPadding-histogramHeight-histogramScatterPlotPadding]),
        xScale2 = d3.scaleLinear()
            .domain(d3.extent(X2, d => d.value))
            .range([0, detailedViewNodeRectWidth-3*scatterPlotPadding-histogramHeight-histogramScatterPlotPadding]),
        xAxis1 = d3.axisBottom(xScale1).tickSizeOuter(0).tickFormat(""),
        xAxis2 = d3.axisBottom(xScale2).tickSizeOuter(0);
        
        const radius = 3, padding = 1.5;
        const marginTop = scatterPlotPadding;
        const marginBottom = detailedViewNodeRectWidth-3*scatterPlotPadding-histogramHeight-histogramScatterPlotPadding;
        const Y1 = dodge(X1.map(x => xScale1(x.value)), radius*2+padding),
            Y2 = dodge(X2.map(x => xScale2(x.value)), radius*2+padding);
        const beeswarmHeight = d3.max(Y1)+(radius+padding)*2+marginTop+marginBottom;
    
        // Draw X-axis for beeswarm plot
        targetSelection.append("g")
            .attr("class", "detailed beeswarm x-axis")
            .attr("transform", `translate(${-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding}
                ,${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding})`)
            .call(xAxis1);
    
        // Draw points for beeswarm plot
        targetSelection.append("g")
            .attr("class", "detailed beeswarm-chart-group")
            .selectAll("circle")
            .data(X1)
            .join("circle")
            .attr("class", "detailed dot")
            .attr("id", d => `dot-${d.index}`)
                .attr("r", radius)
                .attr("cx", d => xScale1(d.value)-0.5*detailedViewNodeRectWidth+2*scatterPlotPadding)
                .attr("cy", (d, i) => -0.5*(detailedViewNodeRectWidth-nodeRectWidth)+histogramHeight+scatterPlotPadding - radius - padding - Y1[i])
                .style("fill", (d) => {
                    if (that.selectedPoints.length && !that.selectedPoints.includes(d.index)) {
                        return "#fff";
                    } else {
                        return colorScale[d.label];
                    }
                })
                .style("stroke", (d) => colorScale[d.label]);
    
}

/**
 * Draw split histogram for detailed view.
 * @date 2022-07-11
 * @param {targetSelection} targetSelection
 * @param {nodeData} nodeData
 * @param {that} that
 */
export function drawSplitHistogramInDetailedView(targetSelection, nodeData, that) {
    const { constants : { detailedViewNodeRectWidth, nodeRectWidth, histogramHeight, scatterPlotPadding, colorScale } } = that;
    // Draw detailed split histogram
    let xRight = d3.scaleLinear()
        .domain([0, _.sum(nodeData.data.totalCount)])
        .range([0, 0.5*histogramHeight]),
        xLeft = d3.scaleLinear()
        .domain([_.sum(nodeData.data.totalCount), 0])
        .range([0, 0.5*histogramHeight]),
        yBand = d3.scaleBand()
        .range([0, histogramHeight-scatterPlotPadding])
        .domain([0,1,2])
        .padding(.1);

    const splitData = nodeData.data.leftCount.map((val, idx) => [val, nodeData.data.rightCount[idx]]);
    const detailedSplitDistribution = targetSelection.selectAll("g.detail-split-distribution")
        .data(splitData)
        .enter()
        .append("g")
        .attr("class", "detailed detail-split-distribution")
        .attr("transform", 
            `translate(${0.5*detailedViewNodeRectWidth-0.5*histogramHeight-0.25*scatterPlotPadding},
                ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+scatterPlotPadding})`);

    // Append left and right split distribution into splitDistribution svg group
    detailedSplitDistribution.append("rect")
        .attr("class", "detailed detail-split-rect")
        .attr("width", (d) => {
            return xRight(d[1]);
        })
        .attr("height", yBand.bandwidth())
        .attr("x", -scatterPlotPadding)
        .attr("y", (d, i) => yBand(i))
        .attr("fill", (d, i) => colorScale[i])
        .style("stroke", "#000")
        .style("stroke-width", "2px");

    detailedSplitDistribution.append("rect")
        .attr("class", "detailed detail-split-rect")
        .attr("width", (d) => {
            return 0.5*histogramHeight-xLeft(d[0]);
        })
        .attr("height", yBand.bandwidth())
        .attr("x", (d) => -0.5*(histogramHeight+2*scatterPlotPadding)+xLeft(d[0]))
        .attr("y", (d, i) => yBand(i))
        .attr("fill", (d, i) => colorScale[i])
        .style("stroke", "#000")
        .style("stroke-width", "2px");

    // Append left and right split distribution text into splitDistribution svg group
    detailedSplitDistribution.append("text")
        .attr("class", "detailed detail-split-text cursor-default")
        .text( (d) => d[1])
        .attr("text-anchor", "start")
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("transform", (d, i) => {
            return `translate(${-scatterPlotPadding+xRight(d[1])+5},
                ${5+0.5*yBand.bandwidth()+yBand(i)})`;
        })

    detailedSplitDistribution.append("text")
        .attr("class", "detailed detail-split-text cursor-default")
        .text( (d) => d[0])
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("transform", (d, i) => {
            return `translate(${-0.5*(histogramHeight+2*scatterPlotPadding)+xLeft(d[0])-5},
                ${5+0.5*yBand.bandwidth()+yBand(i)})`;
        })

    // Append centered axis
    detailedSplitDistribution.append("g")
        .attr("class", "detailed detail-center-axis cursor-default")
        .attr("transform", `translate(${-scatterPlotPadding},
            ${0})`)
        .call(d3.axisLeft(yBand).tickFormat(""));

    detailedSplitDistribution.append("g")
        .attr("class", "detailed detail-center-axis cursor-default")
        .attr("transform", `translate(${-scatterPlotPadding},
            ${0})`)
        .call(d3.axisRight(yBand).tickFormat(""));
}

export function drawExposedSplitHistogramInDetailedView(targetSelection, originalNodeData, exposedNodeData, that) {
    const { constants: { detailedViewNodeRectWidth, nodeRectWidth, histogramHeight, scatterPlotPadding, colorScale } } = that;
    // Draw detailed split histogram
    let xRight = d3.scaleLinear()
        .domain([0, _.sum(originalNodeData.totalCount)])
        .range([0, 0.5*histogramHeight]),
        xLeft = d3.scaleLinear()
        .domain([_.sum(originalNodeData.totalCount), 0])
        .range([0, 0.5*histogramHeight]),
        yBand = d3.scaleBand()
        .range([0, histogramHeight-scatterPlotPadding])
        .domain([0,1,2])
        .padding(.1);

    const splitDataLeft = exposedNodeData.data.leftCount.map((val, idx) => ({
        count: val,
        label: idx,    
    }));

    const splitDataRight = exposedNodeData.data.rightCount.map((val, idx) => ({
        count: val,
        label: idx,    
    }));

    const detailedExposedSplitDistribution = targetSelection.append("g")
        .attr("class", "detailed detail-exposed-split-distribution")
        .attr("transform", 
            `translate(${0.5*detailedViewNodeRectWidth-0.5*histogramHeight-0.25*scatterPlotPadding},
                ${-0.5*(detailedViewNodeRectWidth-nodeRectWidth)+scatterPlotPadding})`);
    
    // Append left and right split distribution into splitDistribution svg group
    detailedExposedSplitDistribution.selectAll(`rect-right#${originalNodeData.name}`)
    .data(splitDataRight)
    .enter()
    .append("rect")
        .attr("class", "detailed detail-exposed-split-rect")
        .attr("id", `${originalNodeData.name}`)
        .attr("width", (d) => {
            return xRight(d.count);
        })
        .attr("height", yBand.bandwidth())
        .attr("x", -scatterPlotPadding)
        .attr("y", (d) => yBand(d.label))
        .attr("fill", (d) => {
            const texture = textures.lines()
                .size(8)
                .strokeWidth(2)
                .stroke("#000")
                .background(colorScale[d.label]);
            detailedExposedSplitDistribution.call(texture);
            return texture.url();
        })
        .style("stroke", "#000")
        .style("stroke-width", "2px")


    detailedExposedSplitDistribution.selectAll(`rect-left#${originalNodeData.name}`)
    .data(splitDataLeft)
    .enter()
    .append("rect")
        .attr("class", "detailed detail-exposed-split-rect")
        .attr("id", `${originalNodeData.name}`)
        .attr("width", (d) => {
            return 0.5*histogramHeight-xLeft(d.count);
        })
        .attr("height", yBand.bandwidth())
        .attr("x", (d) => -0.5*(histogramHeight+2*scatterPlotPadding)+xLeft(d.count))
        .attr("y", (d) => yBand(d.label))
        .attr("fill", (d) => {
            const texture = textures.lines()
                .size(8)
                .strokeWidth(2)
                .stroke("#000")
                .background(colorScale[d.label]);
            detailedExposedSplitDistribution.call(texture);
            return texture.url();
        })
        .style("stroke", "#000")
        .style("stroke-width", "2px");

}

const stackDataGenerator = (bins) => {
    const keys = [0, 1, 2];
    const stackData = [];
    for (const bin of bins) {
        let pushableObj = {};
        pushableObj.x0 = bin.x0;
        pushableObj.x1 = bin.x1;
        bin.forEach(d => {
            if (!pushableObj[d.label]) pushableObj[d.label] = [d.value];
            else pushableObj[d.label].push(d.value);
        });
        keys.forEach((key) => {
            if (!pushableObj[key]) pushableObj[key] = [];
        });
        stackData.push(pushableObj);
    };

    const realStack = d3.stack()
        .keys(keys)
        .value((d, key) => d[key].length);
    return realStack(stackData);
}