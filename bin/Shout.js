"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const node_notifier_1 = __importDefault(require("node-notifier"));
const upath_1 = __importDefault(require("upath"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const PrettyUnits_1 = require("./PrettyUnits");
function padZeroToDoubleDigits(x) {
    let s = '';
    if (x < 10) {
        s += '0';
    }
    s += x;
    return s;
}
function nowFormatted() {
    let t = new Date();
    return padZeroToDoubleDigits(t.getHours()) + ':' + padZeroToDoubleDigits(t.getMinutes()) + ':' + padZeroToDoubleDigits(t.getSeconds());
}
function concatenateTokens(tokens) {
    let message = '';
    for (let token of tokens) {
        if (token instanceof Error) {
            if (token.stack) {
                message += '\n' + chalk_1.default.red(token.stack);
            }
            else {
                message += '\n' + chalk_1.default.red(token.toString());
            }
        }
        else {
            message += ' ' + token;
        }
    }
    return message;
}
exports.Shout = {
    timed: function (...tokens) {
        let message = concatenateTokens(tokens);
        let output = `[${chalk_1.default.grey(nowFormatted())}]` + message;
        console.log(output);
    },
    error: function (...tokens) {
        let message = concatenateTokens(tokens);
        let output = '\n' + chalk_1.default.red('ERROR') + message + '\n';
        console.error(output);
    },
    fatal: function (...tokens) {
        let message = concatenateTokens(tokens);
        let output = '\n' + chalk_1.default.red('FATAL ERROR') + message + '\n';
        console.error(output);
    },
    warning: function (...tokens) {
        let message = concatenateTokens(tokens);
        let output = chalk_1.default.yellow('WARNING') + message;
        console.warn(output);
    },
    typescript: function (...tokens) {
        let message = concatenateTokens(tokens);
        let output = chalk_1.default.blue('TypeScript') + message;
        console.log(output);
    },
    sass: function (...tokens) {
        let message = concatenateTokens(tokens);
        let output = chalk_1.default.magenta('Sass') + message;
        console.log(output);
    },
    enableNotification: true,
    displayVerboseOutput: false,
    notify: function (...tokens) {
        if (!this.enableNotification) {
            return;
        }
        let message = '...';
        let icon = upath_1.default.join(__dirname, '../img/madobe.png');
        if (tokens && tokens.length) {
            message = concatenateTokens(tokens);
        }
        node_notifier_1.default.notify({
            title: 'instapack',
            message,
            icon,
            sound: false
        });
    },
    fileOutput(filePath, content) {
        let bundle = Buffer.from(content, 'utf8');
        let info = upath_1.default.parse(filePath);
        let size = PrettyUnits_1.prettyBytes(bundle.byteLength);
        exports.Shout.timed(chalk_1.default.blue(info.base), chalk_1.default.magenta(size), chalk_1.default.grey('in ' + info.dir + '/'));
        return fs_extra_1.default.outputFile(filePath, bundle);
    }
};
