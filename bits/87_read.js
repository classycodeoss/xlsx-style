function firstbyte(f,o) {
	switch((o||{}).type || "base64") {
		case 'buffer': return f[0];
		case 'base64': return Base64.decode(f.substr(0,12)).charCodeAt(0);
		case 'binary': return f.charCodeAt(0);
		case 'array': return f[0];
		default: throw new Error("Unrecognized type " + o.type);
	}
}

function read_zip(data, opts) {
	var d = data;
	var o = opts||{};
	if(!o.type) o.type = (has_buf && Buffer.isBuffer(data)) ? "buffer" : "base64";
	var zip = new JSZip();
	switch(o.type) {
		case "base64": 
			zip.loadAsync(d, { base64:true }).then(function () {
        			return parse_zip(zip, o);
    		}); 
			break;
		case "binary": case "array": 
			zip.loadAsync(d, { base64:false }).then(function () {
        			return parse_zip(zip, o);
    		}); 
			break;
		case "buffer": 
			zip.loadAsync(d).then(function () {
        			return parse_zip(zip, o);
    		}); 
			break;
		case "file": 
			zip.loadAsync(d=_fs.readFileSync(data)).then(function () {
        			return parse_zip(zip, o);
    		}); 
			break;
		default: throw new Error("Unrecognized type " + o.type);
	}

}

function readSync(data, opts) {
	var zip, d = data, isfile = false, n;
	var o = opts||{};
	if(!o.type) o.type = (has_buf && Buffer.isBuffer(data)) ? "buffer" : "base64";
	if(o.type == "file") { isfile = true; o.type = "buffer"; d = _fs.readFileSync(data); }
	switch((n = firstbyte(d, o))) {
		case 0xD0:
			if(isfile) o.type = "file";
			return parse_xlscfb(CFB.read(data, o), o);
		case 0x09: return parse_xlscfb(s2a(o.type === 'base64' ? Base64.decode(data) : data), o);
		case 0x3C: return parse_xlml(d, o);
		case 0x50:
			if(isfile) o.type = "file";
			return read_zip(data, opts);
		default: throw new Error("Unsupported file " + n);
	}
}

function readFileSync(data, opts) {
	var o = opts||{}; o.type = 'file'
  var wb = readSync(data, o);
  wb.FILENAME = data;
	return wb;
}
