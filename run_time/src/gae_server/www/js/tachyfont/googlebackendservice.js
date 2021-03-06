'use strict';

/**
 * @license
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

goog.provide('tachyfont.GoogleBackendService');

goog.require('goog.Promise');
goog.require('tachyfont.BackendService');
goog.require('tachyfont.FontInfo');
goog.require('tachyfont.GlyphBundleResponse');
goog.require('tachyfont.utils');


goog.scope(function() {



/**
 * Handles interacting with the backend server.
 *
 * @param {string} baseUrl of the backend server.
 * @constructor
 * @extends {tachyfont.BackendService}
 */
tachyfont.GoogleBackendService = function(baseUrl) {
  tachyfont.GoogleBackendService.base(this, 'constructor', baseUrl);
};
goog.inherits(tachyfont.GoogleBackendService, tachyfont.BackendService);
var GoogleBackendService = tachyfont.GoogleBackendService;


/** @type {string} */
GoogleBackendService.GLYPHS_REQUEST_PREFIX = 'g';


/** @type {string} */
GoogleBackendService.GLYPHS_REQUEST_SUFFIX = 'glyphs';


/** @type {string} */
GoogleBackendService.FRAMEWORK_REQUEST_PREFIX = 't';


/** @type {string} */
GoogleBackendService.FRAMEWORK_REQUEST_SUFFIX = 'framework';


/** @override */
GoogleBackendService.prototype.requestCodepoints = function(
    fontInfo, codes) {
  var self = this;
  return this.requestUrl(this.getDataUrl_(fontInfo,
      GoogleBackendService.GLYPHS_REQUEST_PREFIX,
      GoogleBackendService.GLYPHS_REQUEST_SUFFIX),
      'POST',
      'glyphs=' + encodeURIComponent(this.compressedGlyphsList_(codes)),
      {'Content-Type': 'application/x-www-form-urlencoded'})
      .then(function(glyphData) {
        return self.parseHeader_(glyphData);
      });
};


/**
 * Parses the header of a codepoint response and returns info on it:
 * @param {ArrayBuffer} glyphData from a code point request.
 * @return Header info, {count: ..., flags: ..., version: ...,
 *         fontSignature: ...}
 * @private
 */
GoogleBackendService.prototype.parseHeader_ = function(glyphData) {
  var dataView = new DataView(glyphData);
  var offset = 0;
  var magicNumber = '';
  for (var i = 0; i < 4; i++) {
    magicNumber += String.fromCharCode(dataView.getUint8(offset++));
  }

  if (magicNumber == 'BSAC') {
    var version = dataView.getUint8(offset++) + '.' +
        dataView.getUint8(offset++);
    offset += 2; // Skip reserved section.
    var signature = '';
    for (var i = 0; i < 20; i++) {
      signature += dataView.getUint8(offset++).toString(16);
    }
    var count = dataView.getUint16(offset);
    offset += 2;
    var flags = dataView.getUint16(offset);
    offset += 2;
    return new tachyfont.GlyphBundleResponse(
        version, signature, count, flags, offset, glyphData);
  } else {
    throw new Error('Invalid code point bundle header magic number: ' +
        magicNumber);
  }
};


/** @override */
GoogleBackendService.prototype.requestFontBase = function(fontInfo) {
  return this.requestUrl(this.getDataUrl_(fontInfo,
      GoogleBackendService.FRAMEWORK_REQUEST_PREFIX,
      GoogleBackendService.FRAMEWORK_REQUEST_SUFFIX),
      'GET', null, {});
};


/** @override */
GoogleBackendService.prototype.log = function(message) {
  // Not implemented yet.
  return new goog.Promise(function(resolve, reject) {
    resolve(new ArrayBuffer(0));
  });
};


/**
 * @private
 * @param {!tachyfont.FontInfo} fontInfo containing info on the font; ie:
 *     fontkit, familyPath = the font's directory; ie. "notosansjapanese", and
 *     name = Unique name for this particular instance of the font
 *     (style/weight) ie. "notosans100".
 * @param {string} prefix Action prefix in the URL.
 * @param {string} suffix Action suffset in the URL.
 * @return {string} URL for the specified font action.
 */
GoogleBackendService.prototype.getDataUrl_ =
    function(fontInfo, prefix, suffix) {
  var familyPath = fontInfo.getfamilyPath();
  if (!familyPath) {
    // Using familyPath is preferred over familyName.
    familyPath = fontInfo.getFamilyName().replace(/ /g, '').toLowerCase();
  }
  return this.baseUrl + '/' + prefix + '/' + familyPath + '/' +
      fontInfo.getVersion() + '/' + fontInfo.getFontKit() + '.' + suffix;
};


/**
 * @private
 * @param {Array.<number>} codes list of code points to compress.
 * @return {string} compressed code point list.
 */
GoogleBackendService.prototype.compressedGlyphsList_ = function(codes) {
  var result = '';
  for (var i = 0; i < codes.length; i++) {
    var cp = codes[i];
    if (cp != 45) { // Dash
      result = result + tachyfont.utils.stringFromCodePoint(cp);
    } else {
      // Dash is a special character in the compressed glyph list and must
      // be at the start of the string.
      result = '-' + result;
    }
  }
  return result;
};


});  // goog.scope
