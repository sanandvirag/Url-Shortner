const BASE62 =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const generateShortCode = (length: number = 7): string => {
    let result = "";

    for (let i = 0; i < length; i++) {
        const index = Math.floor(Math.random() * BASE62.length);
        result += BASE62[index];
    }

    return result;
};

export default generateShortCode;