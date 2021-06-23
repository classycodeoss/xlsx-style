function safe_parse_wbrels(wbrels, sheets) {
    if (!wbrels) return 0;
    try {
        wbrels = sheets.map(function pwbr(w) {
            return [w.name, wbrels['!id'][w.id].Target];
        });
    } catch (e) {
        return null;
    }
    return !wbrels || wbrels.length === 0 ? null : wbrels;
}

function safe_parse_ws(zip, path, relsPath, sheet, sheetRels, sheets, opts) {
    return new Promise(resolve => {
        console.log(`>>>>>>>> .safe_parse_ws(sheet: ${sheet})`);
        getzipdata(zip, relsPath, true)
            .then(data =>
                sheetRels[sheet] = parse_rels(data, path))
            .then(() =>
                getzipdata(zip, path)
                    .then(relData => {
                        sheets[sheet] = parse_ws(relData, path, opts, sheetRels[sheet]);
                        console.log(`sheets: ${sheets}`);
                        console.log(`sheets[sheet]: ${sheets[sheet]}`);
                    })
            )
            .then(() => {
                console.log(`<<<<<<<< .safe_parse_ws(sheet: ${sheet})`);
                resolve();
            })
            .catch(e => {
                console.warn(`safe_parse_ws() error: ${e}`);
                if (opts.WTF) {
                    reject(e);
                }
            });
    });
}

var nodirs = function nodirs(x) {
    return x.substr(-1) != '/';
};


function prepareOut(out, dir, wb, props, custprops, deps, sheets, opts, entries, zip) {
    out = {
        Directory: dir,
        Workbook: wb,
        Props: props,
        Custprops: custprops,
        Deps: deps,
        Sheets: sheets,
        SheetNames: props.SheetNames,
        Strings: strs,
        Styles: styles,
        Themes: themes,
        SSF: SSF.get_table()
    };
    if (opts.bookFiles) {
        out.keys = entries;
        out.files = zip.files;
    }
    return out;
}

function parse_zip(zip, opts) {
    return new Promise((resolve, reject) => {
        make_ssf(SSF);
        opts = opts || {};
        fix_read_opts(opts);
        reset_cp();

        /* OpenDocument Part 3 Section 2.2.1 OpenDocument Package */
        if (safegetzipfile(zip, 'META-INF/manifest.xml')) resolve(parse_ods(zip, opts));

        var entries = keys(zip.files).filter(nodirs).sort();
        var dir;
        var xlsb = false;
        var binname, sheets;
        var props = {}, propdata = "";
        var custprops = {};
        var out = {};
        var deps = {};
        var sheetRels = {};
        var path, relsPath, wbrels, wbext, wbrelsfile, wb;
        var asyncFuncs = [];
        getzipdata(zip, '[Content_Types].xml')
            .then(contentTypeData => {
                dir = parse_ct(contentTypeData, opts);

            })
            .then(() => {
                if (dir.workbooks.length === 0) {
                    binname = "xl/workbook.xml";
                    getzipdata(zip, binname, true).then(workBookData => {
                        if (workBookData) {
                            dir.workbooks.push(binname);
                        }
                    });
                }
                if (dir.workbooks.length === 0) {
                    binname = "xl/workbook.bin";
                    if (!getzipfile(zip, binname, true)) throw new Error("Could not find workbook");
                    dir.workbooks.push(binname);
                    xlsb = true;
                }
                if (dir.workbooks[0].substr(-3) == "bin") xlsb = true;
                if (xlsb) set_cp(1200);
            })
            .then(() => {
                if (!opts.bookSheets && !opts.bookProps) {
                    strs = [];
                    if (dir.sst) {
                        getzipdata(zip, dir.sst.replace(/^\//, ''))
                            .then(sstData => strs = parse_sst(sstData, dir.sst, opts));
                    }
                    // parse themes before styles so that we can reliably decode theme/tint into rgb when parsing styles
                    themes = {};
                    if (opts.cellStyles && dir.themes.length) {
                        (getzipdata(zip, dir.themes[0].replace(/^\//, ''), true)
                            .then(themesData => themes = parse_theme(themesData, true), dir.themes[0], opts));
                    }
                    styles = {};
                    if (dir.style) {
                        getzipdata(zip, dir.style.replace(/^\//, ''))
                            .then(stylesData => styles = parse_sty(stylesData, dir.style, opts));
                    }
                }
            })
            .then(() =>
                getzipdata(zip, dir.workbooks[0].replace(/^\//, ''))
                    .then(workbookData => wb = parse_wb(workbookData, dir.workbooks[0], opts))
            )
            .then(() => {
                if (dir.coreprops.length !== 0) {
                    getzipdata(zip, dir.coreprops[0].replace(/^\//, ''), true)
                        .then(corePropsData => propData = corePropsData)
                        .then(() => {
                            if (propdata) {
                                props = parse_core_props(propdata);
                            }
                        })
                        .then(() => {
                            if (dir.extprops.length !== 0) {
                                getzipdata(zip, dir.extprops[0].replace(/^\//, ''), true)
                                    .then(extPropData => propData = extPropData)
                                    .then(() => {
                                        if (propdata) {
                                            parse_ext_props(propdata, props);
                                        }
                                    });
                            }
                        });
                }
            })
            .then(() => {
                if (!opts.bookSheets || opts.bookProps) {
                    if (dir.custprops.length !== 0) {

                        getzipdata(zip, dir.custprops[0].replace(/^\//, ''), true).then(custPropsData => {
                            propdata = custPropsData;
                            if (propdata) {
                                custprops = parse_cust_props(propdata, opts);
                            }
                        });
                    }
                }
            })
            .then(() => {
                if (opts.bookSheets || opts.bookProps) {
                    if (props.Worksheets && props.SheetNames.length > 0) {
                        sheets = props.SheetNames;
                        console.log(`...opts.bookSheets: sheets: ${sheets}`);
                    } else if (wb.Sheets) sheets = wb.Sheets.map(function pluck(x) {
                        return x.name;
                    });

                    if (opts.bookProps) {
                        out.Props = props;
                        out.Custprops = custprops;
                    }
                    if (typeof sheets !== 'undefined') {
                        out.SheetNames = sheets;
                    }
                    if (opts.bookSheets ? out.SheetNames : opts.bookProps) {
                        resolve(out);
                    }
                }
                sheets = {};
            })
            .then(() => {
                if (opts.bookDeps && dir.calcchain) {
                    getzipdata(zip, dir.calcchain.replace(/^\//, '')
                        .then(calcChainData => deps = parse_cc(calcChainData, dir.calcchain, opts)));
                }

            })
            .then(res => deps = res)
            .then(() => {
                if (!props.Worksheets) {
                    var wbsheets = wb.Sheets;
                    props.Worksheets = wbsheets.length;
                    props.SheetNames = [];
                    for (var j = 0; j !== wbsheets.length; ++j) {
                        props.SheetNames[j] = wbsheets[j].name;
                    }
                }

                wbext = xlsb ? "bin" : "xml";
                wbrelsfile = 'xl/_rels/workbook.' + wbext + '.rels';
            })
            .then(() => {
                getzipdata(zip, wbrelsfile, true)
                    .then(wbrelsFileData => wbrels = parse_rels(wbrelsFileData, wbrelsfile));
            })
            .then(() => {
                if (wbrels) {
                    wbrels = safe_parse_wbrels(wbrels, wb.Sheets);
                }
            })
            .then(() =>
                /* Numbers iOS hack */
                getzipdata(zip, "xl/worksheets/sheet.xml", true)
                    .then(sheetXmlData => {
                        console.log(`ioshack: ${sheetXmlData}`);
                        var nmode = 0;
                        if (sheetXmlData) {
                            nmode = 1;
                        }
                        for (i = 0; i !== props.Worksheets; ++i) {
                            if (wbrels) {
                                path = 'xl/' + (wbrels[i][1]).replace(/[\/]?xl\//, "");
                            } else {
                                path = 'xl/worksheets/sheet' + (i + 1 - nmode) + "." + wbext;
                                path = path.replace(/sheet0\./, "sheet.");
                            }
                            relsPath = path.replace(/^(.*)(\/)([^\/]*)$/, "$1/_rels/$3.rels");
                            asyncFuncs.push(safe_parse_ws(zip, path, relsPath, props.SheetNames[i], sheetRels, sheets, opts));
                        }
                        console.log(`all functions pushed\n\n`);
                    })
            )
            .then(() => {
                console.log('starting to execute async functions');
               return Promise.all(asyncFuncs)
                    .then(() => {
                        console.log('\n\t\t>>>>>promise.all done\n');
                    });
            })
            .then(() => {
                console.log('started with prepareOut, this should only after promise.all done!!!!\n\n');
                if (dir.comments) parse_comments(zip, dir.comments, sheets, sheetRels, opts);

                // all out.* data needs to be ready here
                out = prepareOut(out, dir, wb, props, custprops, deps, sheets, opts, entries, zip);
                console.log(`prepareOut done!!!!`);
            })
            .then(() => {
                console.log('started with opts bookVBA, this should only after promise.all done!!!!\n\n');
                if (opts.bookVBA) {
                    if (dir.vba.length > 0) {
                        getzipdata(zip, dir.vba[0], true).then(vbaData => out.vbaraw = vbaData);
                    } else if (dir.defaults.bin === 'application/vnd.ms-office.vbaProject') {
                        getzipdata(zip, 'xl/vbaProject.bin', true).then(vbaData => out.vbaraw = vbaData);
                    }
                }
            })
            .then(() => {
                console.log('xlsx-style .parse_zip() finishing, resolving out');
                resolve(out);
            })
            .catch(error => {
                console.error(`xlsx-style .parse_zip() encountered error:\n${error}\n`);
                reject(error);
            });
    });
}
