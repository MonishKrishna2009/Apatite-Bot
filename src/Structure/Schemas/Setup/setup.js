const { Schema, model } = require('mongoose');

const setup = new Schema({
    guildId: {
        type: String
    },
    anuke: {
        type: Boolean,
        default: false
    },

    smod: {
        type: Boolean,
        default: false
    },

    apunish: {
        type: Boolean,
        default: false
    },

    araid: {
        type: Boolean,
        default: false
    }
});

module.exports = model('setupSchema', setup);