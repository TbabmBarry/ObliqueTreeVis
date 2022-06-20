
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
                rootNode = new TreeNode(this.decisionNodes[nodeIdx], pathStr, "decision");
            } else {
                let pathArr = pathStr.split(""), i = 0;
                const k = pathArr.length;
                currNode = rootNode;
                while (i < k-1) {
                    pathArr[i] == "l" ? currNode = currNode.left : currNode = currNode.right;
                    i++;
                }
                pathArr[i] == "l" 
                    ? currNode.left = new TreeNode(this.decisionNodes[nodeIdx], pathStr, "decision")
                    : currNode.right = new TreeNode(this.decisionNodes[nodeIdx], pathStr, "decision");
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
};

export const parseCSV = (data, type) => {
    return type == "int"
        ? data.map(row => Object.keys(row).map(key => parseInt(row[key]))) 
        : data.map(row => Object.keys(row).map(key => parseFloat(row[key])));
};


