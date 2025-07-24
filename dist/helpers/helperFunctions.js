"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanText = cleanText;
function cleanText(text) {
    return text
        .replace(/[^\p{L}\p{N} ]+/gu, "")
        .replace(/\s+/g, " ")
        .toLowerCase()
        .trim();
}
