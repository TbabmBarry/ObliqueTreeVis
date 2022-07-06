import { csvParseRows } from "d3-dsv";
import _ from 'lodash';



/**
 * Example input: builder
 * Oblique tree:
 * root Hyperplane: Left = [115,0,52], Right = [0,99,0], Oblique Split: -0.699623 x[2] + 1.000000 x[4] + -0.464679 = 0
 * l Hyperplane: Left = [0,0,49], Right = [115,0,3], Oblique Split: -3.413128 x[1] + 1.000000 x[5] + 0.388552 = 0
 * lr Hyperplane: Left = [1,0,3], Right = [114,0,0], Oblique Split: -1.185092 x[1] + 1.000000 x[5] + 0.296273 = 0
 * lrl Hyperplane: Left = [0,0,3], Right = [1,0,0], Oblique Split: 1.000000 x[2] + -0.145013 = 0
 * builder = {
 *  trainingSet: [
 *      {},
 *      {},
 *      {},
 *      ...
 *  ],
 *  nodeTreePath: [root, l, lr, lrl],
 *  decisionNodes: [
 *      [0, -0.699623, 0, 1.000000, 0, -0.464679],
 *      [-3.413128, 0, 0, 0, 1.000000, 0.388552],
 *      [-1.185092, 0, 0, 0, 1.000000, 0.296273],
 *      [0, 1.000000, 0, 0, 0, -0.145013]
 *  ],
 * }
 * 
 * Node coefficients:
 * [[ 0.          0.          1.          0.        ]
 * [ 0.          0.00638759  0.         -0.17323776]
 * [ 0.          0.          1.          0.        ]]
 * Oblique tree:
 * Root Hyperplane: Left = [13,0,0], Right = [0,19,13], Oblique Split: 1.000000 x[3] + -2.550000 = 0
 * r Hyperplane: Left = [0,0,12], Right = [0,19,1], Oblique Split: 0.006388 x[2] + -0.173238 x[4] + 0.291713 = 0
 * rr Hyperplane: Left = [0,18,0], Right = [0,1,1], Oblique Split: 1.000000 x[3] + -5.000000 = 0
 * 
 */

 class TreeNode {
    constructor(sv, name, type) {
        this.name = name;
        this.type = type;
        this.split = sv.slice();
        this.subTrainingSet = [];
        this.featureIdx = [];
        this.left = null;
        this.right = null;
        this.totalCount = new Array(3).fill(0);
        this.leftCount = new Array(3).fill(0);
        this.rightCount = new Array(3).fill(0);
        this.leftTrainingSet = [];
        this.rightTrainingSet = [];
        this.featureContribution = [];
    }
}

export default class BivariateDecisionTree {

    constructor(builder) {
        this.trainingSet = builder.trainingSet;
        this.labelSet = builder.labelSet;
        this.nodeTreePath = builder.nodeTreePath;
        this.decisionNodes = builder.decisionNodes.map(arr => arr.slice());
        this.numFeature = this.decisionNodes[0].length - 1;
        this.numLabel = new Set(this.labelSet).size;
        this.root = null;
        this.output = null;
    }

    /**
     * Build bivariate decision tree, re-classify all the training points, and output
     * target data structure.
     * @date 2022-06-20
     */
    run() {
        this.build();
        this.classify();
        this.computeFeatureContribution();
        this.export();
    }

    /**
     * Generate a bivariate decision tree with passed builder info
     * and return the root node of the tree.
     * @date 2022-06-18
     */
    build() {
        let currNode;
        this.nodeTreePath.forEach((pathStr, nodeIdx) => {
            if (pathStr == "root") {
                this.root = new TreeNode(this.decisionNodes[nodeIdx], pathStr, "decision");
                currNode = this.root;
            } else {
                let pathArr = pathStr.split(""), i = 0;
                const k = pathArr.length;
                currNode = this.root;
                while (i < k-1) {
                    pathArr[i] == "l" ? currNode = currNode.left : currNode = currNode.right;
                    i++;
                }
                pathArr[i] == "l" 
                    ? currNode.left = new TreeNode(this.decisionNodes[nodeIdx], pathStr, "decision")
                    : currNode.right = new TreeNode(this.decisionNodes[nodeIdx], pathStr, "decision");
            }
        })
    }

    /**
     * Export decision paths for training data.
     * @date 2022-06-18
     */
    export() {
        // Create data structure for n-ary tree nodes
        const exportNaryTreeNode = (node) => {
            return {
                name: node.name,
                type: node.type,
                split: node.split.slice(),
                leftCount: node.type === "decision" ? node.leftCount.slice() : [],
                rightCount: node.type === "decision" ? node.rightCount.slice() : [],
                totalCount: node.totalCount.slice(),
                subTrainingSet: node.subTrainingSet.slice(),
                leftSubTrainingSet: node.type === "decision" ? node.leftTrainingSet.slice() : [],
                rightSubTrainingSet: node.type === "decision" ? node.rightTrainingSet.slice() : [],
                featureIdx: this.getFeatureIndex(node),
                featureContribution: node.type === "leaf" ? node.featureContribution.map(arr => arr.slice()) : [],
                children: traverse(node),
            };
        };

        // Traverse the original binary tree recursively
        const traverse = (currNode) => {
            if (currNode == null) return;
            const res = [];
            currNode.left && res.push(exportNaryTreeNode(currNode.left));
            currNode.right && res.push(exportNaryTreeNode(currNode.right));
            return res;
        };

        this.output = exportNaryTreeNode(this.root);
    }

    /**
     * Use the bivariate decision tree (pointed to root) to 
     * classify training data points.
     * @date 2022-06-18
     */
    classify() {
        this.trainingSet.forEach((point, idx) => {
            let currNode = this.root, sum = 0;
            while (currNode != null) {
                // Store each training point passing through the current node
                currNode.subTrainingSet.push(idx);
                // Count the true labels for training points passing through the current node
                currNode.totalCount[this.labelSet[idx]]++;
                // Oblique split test: element-wise multiplication
                sum = currNode.split[this.numFeature];
                sum += point.map((val, i) => val*currNode.split[i]).reduce((a, b) => a+b);
                
                // When current point is classified into left hand side
                if (sum < 0 && currNode.type !== "leaf") {
                    // Count the number of training point by true labels classified into lhs
                    currNode.leftCount[this.labelSet[idx]]++;
                    // Store each training point classified into lhs passing the current node
                    currNode.leftTrainingSet.push(idx);
                    if (currNode.left != null && currNode.type === "decision") {
                        currNode = currNode.left;
                    } else {
                        // Count leaf node labels and store points
                        currNode.left = new TreeNode(new Array(8).fill(0), currNode.name + "-llf", "leaf");
                        currNode.left.totalCount[this.labelSet[idx]]++;
                        currNode.left.subTrainingSet.push(idx);
                        break;
                    }
                // When current point is classified into right hand side
                } else if (sum >= 0 && currNode.type !== "leaf") {
                    // Count the number of training point by true labels classified into rhs
                    currNode.rightCount[this.labelSet[idx]]++;

                    // Store each training point classified into rhs passing the current node
                    currNode.rightTrainingSet.push(idx);
                    if (currNode.right != null) {
                        currNode = currNode.right;
                    } else {
                        // Count leaf node labels and store points
                        currNode.right = new TreeNode(new Array(8).fill(0), currNode.name + "-llf", "leaf");
                        currNode.right.totalCount[this.labelSet[idx]]++;
                        currNode.right.subTrainingSet.push(idx);
                        break;
                    }
                } else {
                    break;
                }
            }
        });
    }

    /**
     * Compute feature contribution and store results into tree nodes
     * @date 2022-06-21
     */
    computeFeatureContribution() {
        const results = Array(this.numFeature).fill(null).map(() => Array(this.numLabel).fill(0));

        const normalizeArr = (count) => {
            const absCount = count.map(element => Math.abs(element));
            const n = _.sum(absCount);
            return absCount.map(element => element / n);
        }

        const helper = (node, prevNode, prevMeanY, localFC) => {
            if (!node) return;
            const currMeanY = normalizeArr(node.totalCount);
            const localIncre = currMeanY.map((val, i) => val - prevMeanY[i]);
            const currFeatureIdx = this.getFeatureIndex(prevNode);
            const featureCoeff = currFeatureIdx.map((idx) => prevNode.split[idx]);
            const featureWeight = normalizeArr(featureCoeff);
            let tmpLocalIncre;
            const currLocalFC = localFC.map(arr => arr.slice());
            featureWeight.forEach((val, i) => {
                tmpLocalIncre = localIncre.map(li => li * val);
                currLocalFC[currFeatureIdx[i]] = localFC[currFeatureIdx[i]].map((fc, j) => fc + tmpLocalIncre[j]);
            });
            if (node.left === null && node.right === null) {
                node.featureContribution = currLocalFC.map(arr => arr.slice());
            } else {
                helper(node.left, node, currMeanY, currLocalFC);
                helper(node.right, node, currMeanY, currLocalFC);
            };
        };

        const prevProportion = normalizeArr(this.root.totalCount);
        helper(this.root.left, this.root, prevProportion, results);
        helper(this.root.right, this.root, prevProportion, results);
    }

    /**
     * Return all the paths from the root to every leaf node recursively
     * @date 2022-06-21
     */
    treePaths() {
        let path = "";
        const res = [];
        const helper = (node, path) => {
            if (!node) return;
            path += node.name;
            if (node.left === null && node.right === null) {
                res.push(path);
            } else {
                path += "->";
                helper(node.left, path);
                helper(node.right, path);
            }
        }   
        helper(this.root, path);
        return res;
    }


    maxDepth(currNode) {
        if (currNode == null) return 0;
        return 1 + Math.max(this.maxDepth(currNode.left), this.maxDepth(currNode.right));
    }

    getFeatureIndex(currNode) {
        const res = [];
        for (let i = 0; i < this.numFeature; i++) {
            if (currNode.split[i] !== 0) res.push(i);
        }
        return res;
    }
};

export const parseCSV = (data) => {
    let trainingSet, labelSet;
    trainingSet = csvParseRows(data[0]).map(row => row.map(element => parseFloat(element)));
    labelSet = csvParseRows(data[1]).map(element => parseInt(element));
    return {
        trainingSet,
        labelSet
    };
};


