const newInterval = (func, millisecond) => {
    const inside = async () => {
        await func();
        setTimeout(inside, millisecond);
    };
    setTimeout(inside, millisecond);
};

const sleep = (wait) => new Promise((resolve) => setTimeout(resolve, wait));

module.exports = {
    newInterval,
    sleep,
};
