const fs = require('fs');

const info  = (file, content) => {
    console.log(content)
    fs.appendFileSync(file, content + "\n", (err) => {
        if (err) console.log(err);
    });
}


module.exports = {
    info
}