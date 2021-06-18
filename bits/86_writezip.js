function add_rels(rels, rId, f, type, relobj) {
	if(!relobj) relobj = {};
	if(!rels['!id']) rels['!id'] = {};
	relobj.Id = 'rId' + rId;
	relobj.Type = type;
	relobj.Target = f;
	if(rels['!id'][relobj.Id]) throw new Error("Cannot rewrite rId " + rId);
	rels['!id'][relobj.Id] = relobj;
	rels[('/' + relobj.Target).replace("//","/")] = relobj;
}

function write_zip(wb, opts) {
	/*
	if(wb && !wb.SSF) {
		wb.SSF = SSF.get_table();
	}
	if(wb && wb.SSF) {
		make_ssf(SSF); SSF.load_table(wb.SSF);
		opts.revssf = evert_num(wb.SSF); opts.revssf[wb.SSF[65535]] = 0;
	}
	opts.rels = {}; opts.wbrels = {};
	opts.Strings = []; opts.Strings.Count = 0; opts.Strings.Unique = 0;
	var wbext = opts.bookType == "xlsb" ? "bin" : "xml";
	var ct = { workbooks: [], sheets: [], calcchains: [], themes: [], styles: [],
		coreprops: [], extprops: [], custprops: [], strs:[], comments: [], vba: [],
		TODO:[], rels:[], xmlns: "" };
	fix_write_opts(opts = opts || {});
	var zip = new jszip();
	var f = "", rId = 0;

	opts.cellXfs = [];
	get_cell_style(opts.cellXfs, {}, {revssf:{"General":0}});

	f = "core.xml";
	var docPropsFolder = zip.folder("docProps");
	docPropsFolder.file(f, write_core_props(wb.Props, opts));
	ct.coreprops.push(f);
	add_rels(opts.rels, 2, f, RELS.CORE_PROPS);

	f = "app.xml";
	if(!wb.Props) wb.Props = {};
	wb.Props.SheetNames = wb.SheetNames;
	wb.Props.Worksheets = wb.SheetNames.length;
	docPropsFolder.file(f, write_ext_props(wb.Props, opts));
	ct.extprops.push(f);
	add_rels(opts.rels, 3, f, RELS.EXT_PROPS);

	if(wb.Custprops !== wb.Props && keys(wb.Custprops||{}).length > 0) {
		f = "custom.xml";
		docPropsFolder.file(f, write_cust_props(wb.Custprops, opts));
		ct.custprops.push(f);
		add_rels(opts.rels, 4, f, RELS.CUST_PROPS);
	}
	var xlFolder = zip.folder("xl");
	f = "workbook." + wbext;
	xlFolder.file(f, write_wb(wb, f, opts));
	ct.workbooks.push(f);
	add_rels(opts.rels, 1, f, RELS.WB);

	var worksheetsXlFolder = xlFolder.folder("worksheets");
	for(rId=1;rId <= wb.SheetNames.length; ++rId) {
		f = "sheet" + rId + "." + wbext;
		worksheetsXlFolder.file(f, write_ws(rId-1, f, opts, wb));
		ct.sheets.push(f);
		add_rels(opts.wbrels, rId, "worksheets/sheet" + rId + "." + wbext, RELS.WS);
	}

	if(opts.Strings != null && opts.Strings.length > 0) {
		f = "sharedStrings." + wbext;
		xlFolder.file(f, write_sst(opts.Strings, f, opts));
		ct.strs.push(f);
		add_rels(opts.wbrels, ++rId, "sharedStrings." + wbext, RELS.SST);
	}

	
	var xlThemeFolder = xlFolder.folder("theme");
	f = "theme1.xml";
  	xlThemeFolder.file(f, write_theme(opts));
	ct.themes.push(f);
	add_rels(opts.wbrels, ++rId, "theme/theme1.xml", RELS.THEME);

	

	f = "xl/styles." + wbext;
	xlFolder.file(f, write_sty(wb, f, opts));
	ct.styles.push(f);
	add_rels(opts.wbrels, ++rId, "styles." + wbext, RELS.STY);

	zip.file("[Content_Types].xml", write_ct(ct, opts));
	var uscoreRelsFolder = zip.folder("_rels");
	uscoreRelsFolder.file('.rels', write_rels(opts.rels));
	var uscoreRelsXLFolder = xlFolder.folder("_rels");
	uscoreRelsXLFolder.file('xl/_rels/workbook.' + wbext + '.rels', write_rels(opts.wbrels));
*/

var zip = new JSZip();
zip.file("Hello.txt", "Hello World\n");
var img = zip.folder("images");
img.file("smile.gif", "Hello World\n");
zip.generateAsync({type:"blob"})
.then(function (blob) {
    saveAs(blob, "hello.zip");
});

	return zip;
}
