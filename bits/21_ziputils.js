function getdata(data) {
    return new Promise(((resolve, reject) => {
        if (!data) {
            resolve();
        }
        if (data.name.substr(-4) === ".bin") {
            if (data.data) {
                resolve(char_codes(data.data));
            }
            if (data.asNodeBuffer && has_buf) {
                resolve(data.asNodeBuffer());
            }
            if (data._data && data._data.getContent) {
                resolve(Array.prototype.slice.call(data._data.getContent()));
            }
        } else {
            if (data.data) {
                resolve(data.name.substr(-4) !== ".bin" ? debom_xml(data.data) : char_codes(data.data));
            } else if (data.asNodeBuffer && has_buf) {
                data.async()
                    .then(binData => resolve(debom_xml(binData)))
                    .catch(error => {
                        console.error(`xlsx-style getData(nodebuffer) received error:\n${error}`);
                        reject(error);
                    });
            } else if (data.asBinary) {
                data.async("string")
                    .then(binData => resolve(debom_xml(binData)))
                    .catch(error => {
                        console.error(`xlsx-style getData(string) received error:\n${error}`);
                        reject(error);
                        }
                    );
            } else if (data._data && data._data.getContent) {
                resolve(debom_xml(cc2str(Array.prototype.slice.call(data._data.getContent(), 0))));
            } else {
                resolve();
            }
        }
    }));
}

function safegetzipfile(zip, file) {
    var f = file;
    if (zip.files[f]) return zip.files[f];
    f = file.toLowerCase();
    if (zip.files[f]) return zip.files[f];
    f = f.replace(/\//g, '\\');
    if (zip.files[f]) return zip.files[f];
    return null;
}

function getzipfile(zip, file) {
    var o = safegetzipfile(zip, file);
    if (o == null){
        throw new Error("Cannot find file " + file + " in zip");
    }
    return o;
}

function getzipdata(zip, file, safe) {
    return new Promise(resolve => {
        if (!safe) {
            var zipFile;
            try{
                zipFile =getzipfile(zip, file);
                resolve(getdata(zipFile));
            } catch(error){
                console.warn(`.getzipdata() file: ${file} error:\n${error}`);
                resolve(null);
            }

        } else if (!file) {
            resolve(null);
        } else {
            try {
                resolve(getzipdata(zip, file));
            } catch (e) {
                resolve(null);
            }
        }
    });

}

var _fs, jszip;
if (typeof JSZip !== 'undefined') jszip = JSZip;
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        if (has_buf && typeof jszip === 'undefined') jszip = require('js' + 'zip');
        if (typeof jszip === 'undefined') jszip = require('./js' + 'zip').JSZip;
        _fs = require('f' + 's');
    }
}
