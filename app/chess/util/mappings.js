'use strict';
/**
 * Object with letters as keys and x indices as values
 */
exports.LETTERMAP = {a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7};

/**
 * Object with x indices as keys and letters as values
 */
exports.NUMMAP = {0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e', 5: 'f', 6: 'g', 7: 'h'};

/**
 *  From letter coords (A-H, 1-8) to num coords (0-7, 0-7)
 */
exports.str_to_index = {
    X_MAP: (letter) => {
        return exports.LETTERMAP[letter];
    }, 
    Y_MAP: (num) => {
        num = parseInt(num);
        if (num <= 8 && num > 0) return 8-num;
            throw new Error('Number out of bounds');
    }
};

/**
 * From num coords (0-7, 0-7) to letter coords (A-H, 1-8)
 */ 
exports.index_to_str = {
    X_MAP: (x) => {
        return exports.NUMMAP[x];
    }, 
    Y_MAP: (y) => {
        if (y < 8 && y >= 0) return 8-y;
            throw new Error('Number out of bounds');
    }
};
