function write_zip_type(wb, opts, filename) {
	var o = opts||{};
  style_builder  = new StyleBuilder(opts);

  var z = write_zip(wb, o);
	switch(o.type) {
		case "base64": 
			z.generateAsync({type:"base64"}).then(function (blob){
			saveAs(blob, filename);

			});
			break;
		case "binary": 
			z.generate({type:"string"}).then(function (blob){
			saveAs(blob, filename);

			});
			break;
		case "buffer": 
		z.generateAsync({type:"blob"}).then(function (blob){
			saveAs(blob, filename);
			});
			break;
		case "file": 
			console.warn('88_write.js write_zip_type() TODO not migrated yet to JSZip 3.x');
			return _fs.writeFileSync(o.file, z.generate({type:"nodebuffer"}));
		default: throw new Error("Unrecognized type " + o.type);
	}
}

function writeAsync(wb, opts, filename) {
	var o = opts||{};
	switch(o.bookType) {
		case 'xml': return write_xlml(wb, o);
		default: return write_zip_type(wb, o, filename);
	}
}

function writeFileSync(wb, filename, opts) {
	var o = opts||{}; o.type = 'file';

	o.file = filename;
	switch(o.file.substr(-5).toLowerCase()) {
		case '.xlsx': o.bookType = 'xlsx'; break;
		case '.xlsm': o.bookType = 'xlsm'; break;
		case '.xlsb': o.bookType = 'xlsb'; break;
	default: switch(o.file.substr(-4).toLowerCase()) {
		case '.xls': o.bookType = 'xls'; break;
		case '.xml': o.bookType = 'xml'; break;
	}}
	return writeAsync(wb, o, filename);
}

