
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
 *  splitDistributions: [
 *      { left: [115,0,52], right: [0,99,0] },
 *      { left: [0,0,49], right: [115,0,3] },
 *      { left: [1,0,3], right: [114,0,0] },
 *      { left: [0,0,3], right: [1,0,0] },
 *  ]
 * }
 * 
 */

 class Node {
    constructor(sv = null) {
        this.split = sv.slice();
        this.subTrainingSet = []
        this.left = null
        this.right = null
        this.leftCount = []
        this.rightCount = []
        this.leftTrainingSet = []
        this.rightTrainingSet = []
    }
}

class BivariateDecisionTree {

    constructor(builder) {
        this.trainingSet = builder.trainingSet;
        this.labelSet = builder.labelSet;
        this.nodeTreePath = builder.nodeTreePath;
        this.decisionNodes = builder.decisionNodes.map(arr => arr.slice());
        this.numFeature = this.decisionNodes[0].length - 1;
        this.splitDistributions = builder.splitDistributions;
        this.root = this.build();
    }

    /**
     * Generate a bivariate decision tree with passed builder info
     * and return the root node of the tree.
     * @date 2022-06-18
     */
    build() {
        let rootNode, currNode;
        this.nodeTreePath.forEach((pathStr, nodeIdx) => {
            if (pathStr == "root") {
                rootNode = new Node(this.decisionNodes[nodeIdx]);
            } else {
                let pathArr = pathStr.split(""), i = 0;
                const k = pathArr.length;
                currNode = rootNode;
                while (i < k-1) {
                    pathArr[i] == "l" ? currNode = currNode.left : currNode = currNode.right;
                    i++;
                }
                pathArr[i] == "l" ? currNode.left = new Node(this.decisionNodes[nodeIdx]) : currNode.right = new Node(this.decisionNodes[nodeIdx]);
            }
        })
        return rootNode;
    }

    /**
     * Export decision paths for training data.
     * @date 2022-06-18
     */
    export() {

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
                sum = currNode.split[numFeature];
                sum += point.map((val, i) => val*currNode.split[i]).reduce((a, b) => a+b);
                if (sum < 0) {
                    if (currNode.left != null) {
                        currNode = currNode.left;
                        // TODO: store this point into sub training set at current decision node
                    } else {
                        // TODO: think about what to do with leaf nodes
                        break;
                    }
                } else {
                    if (currNode.right != null) {
                        currNode = currNode.right;
                        // TODO: store this point into sub training set at current decision node
                    } else {
                        // TODO: think about what to do with leaf nodes
                        break;
                    }
                }
            }
        })
    }
}

export default BivariateDecisionTree;
