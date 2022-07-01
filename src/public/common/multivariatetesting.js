import {
    CONSTANTS
} from './config';
import storageService from './services/storageService';


export const generateMultivariateUserData = () => {
    const MV_USER_DATA = {
        NUM: Math.random(),
        TIMESTAMP: Date.now() / 1000,
    };
    storageService.setItem('MV_USER_DATA', JSON.stringify(MV_USER_DATA));
    return MV_USER_DATA;
};

export const getUserNum = (context) => {
    const query = new URLSearchParams(context.router.history.location.search);
    if (query.has('MV_USER_NUM')) {
        // Useful for dev/testing.
        return parseFloat(query.get('MV_USER_NUM'));
    } else {
        let MV_USER_DATA = storageService.getItem('MV_USER_DATA');
        if (!MV_USER_DATA) {
            MV_USER_DATA = generateMultivariateUserData();
        } else {
            MV_USER_DATA = JSON.parse(MV_USER_DATA);
            if (MV_USER_DATA.TIMESTAMP < CONSTANTS.MV_RESET_TIMESTAMP) {
                MV_USER_DATA = generateMultivariateUserData();
            }
        }
        return MV_USER_DATA.NUM;
    }
};

export const setupMultivariateTest = (context, BROWSER, ga) => {
    let MV_USER_NUM = 0;
    if (BROWSER) {
        MV_USER_NUM = getUserNum(context);
    }

    context.BUCKET_SIZE = 1 / CONSTANTS.MV_NUM_BUCKETS;

    // Groups are 1 indexed, which is less confusing for non-programmers.
    const groupNum = 1 + Math.floor(MV_USER_NUM * CONSTANTS.MV_NUM_BUCKETS);
    const groupName = `MV Group ${groupNum}/${CONSTANTS.MV_NUM_BUCKETS}`;
    console.log('groupNum', groupNum, 'groupName', groupName);
    context.multivariateGroup = groupNum;
    ga('set', {
        dimension2: groupName,
    });

    context.multivariateGroupSelect = (items) => {
        if (process.env.NODE_ENV !== 'production') {
            if (!items) {
                throw new Error(`Items missing.`);
            }
            const itemsLen = Object.keys(items).length;
            // Don't count control group.
            const percentageUnderTest = context.BUCKET_SIZE * (itemsLen - 1);
            if (percentageUnderTest > CONSTANTS.MV_DSFT_THRESHOLD) {
                throw new Error(`Too many variations, an Ariane will be required: ${itemsLen} items.`);
            }
        }
        return context.arianeMultivariateGroupSelect(items);
    };
    context.arianeMultivariateGroupSelect = (items) => {
        if (process.env.NODE_ENV !== 'production') {
            if (!items) {
                throw new Error(`Items missing.`);
            }
            const keys = Object.keys(items);
            if (keys.length === 0 || keys.length === 1) {
                throw new Error(`Invalid number of items: ${keys.length}.`);
            }
            for (const key of keys) {
                // 1 doesn't always === Math.floor(1), but 1 == Math.floor(1)
                if (key !== 'control' && (key < 1 || key > CONSTANTS.MV_NUM_BUCKETS || key != Math.floor(key))) {
                    throw new Error(`${key} is invalid.`);
                }
            }
            if (keys.length < CONSTANTS.MV_NUM_BUCKETS && !('control' in items)) {
                throw new Error(`control is missing`);
            }
        }
        if (context.multivariateGroup in items) {
            return items[context.multivariateGroup];
        }
        if ('control' in items) {
            return items.control;
        }
        throw new Error(`${context.multivariateGroup} not found, no control present.`);
    };
};