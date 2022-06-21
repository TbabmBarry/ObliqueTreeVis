import { csvParseRows } from "d3-dsv";


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
    }
}

export default class BivariateDecisionTree {

    constructor(builder) {
        this.trainingSet = builder.trainingSet;
        this.labelSet = builder.labelSet;
        this.nodeTreePath = builder.nodeTreePath;
        this.decisionNodes = builder.decisionNodes.map(arr => arr.slice());
        this.numFeature = this.decisionNodes[0].length - 1;
        this.root = null;
        this.output = null;
    }

    /**
     * Build bivariate decision tree, re-classify all the training points, and output
     * target data structure.
     * @date 2022-06-20
     */
    init() {
        this.build();
        this.classify();
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
        const helper = (currNode) => {
            if (currNode == null) return;
            const res = [];
            currNode.left && res.push({
                name: currNode.left.name,
                type: currNode.left.type,
                split: currNode.left.split.slice(),
                leftCount: currNode.left.type === "decision" ? currNode.left.leftCount.slice() : [],
                rightCount: currNode.left.type === "decision" ? currNode.left.rightCount.slice() : [],
                totalCount: currNode.left.totalCount.slice(),
                subTrainingSet: currNode.left.subTrainingSet.slice(),
                featureIdx: this.getFeatureIndex(currNode.left), 
                children: helper(currNode.left),
            });
            currNode.right && res.push({
                name: currNode.right.name,
                type: currNode.right.type,
                split: currNode.right.split.slice(),
                leftCount: currNode.right.type === "decision" ? currNode.right.leftCount.slice() : [],
                rightCount: currNode.right.type === "decision" ? currNode.right.rightCount.slice() : [],
                totalCount: currNode.right.totalCount.slice(),
                subTrainingSet: currNode.right.subTrainingSet.slice(),
                featureIdx: this.getFeatureIndex(currNode.right),
                children: helper(currNode.right),
            });
            return res;
        };
        this.output = {
            name: this.root.name,
            type: this.root.type,
            split: this.root.split.slice(),
            leftCount: this.root.leftCount.slice(),
            rightCount: this.root.rightCount.slice(),
            totalCount: this.root.totalCount.slice(),
            subTrainingSet: this.root.subTrainingSet.slice(),
            featureIdx: this.getFeatureIndex(this.root),
            children: helper(this.root)
        }
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
                        currNode.left = new TreeNode(new Array(8).fill(0), currNode.name + "-ll", "leaf");
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
                        currNode.right = new TreeNode(new Array(8).fill(0), currNode.name + "-rl", "leaf");
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


