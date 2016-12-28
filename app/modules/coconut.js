function Module() {
	this.digitalValue = new Array(14);
	this.analogValue = new Array(6);

	this.remoteDigitalValue = new Array(14);
	this.readablePorts = null;
	this.remainValue = null;
}

Module.prototype.init = function(handler, config) {
};

Module.prototype.requestInitialData = function() {
	return null;
};

Module.prototype.checkInitialData = function(data, config) {
	return true;
};

Module.prototype.validateLocalData = function(data) {
	return true;
};

Module.prototype.handleRemoteData = function(handler) {
	this.readablePorts = handler.read('readablePorts');
	var digitalValue = this.remoteDigitalValue;
	for (var port = 0; port < 14; port++) {
		digitalValue[port] = handler.read(port);
	}
};

Module.prototype.requestLocalData = function() {
    var _isParseStart = false;
    var _isParseStartIndex = 0;

    function processData(bytes) {
        var len = bytes.length;   // ArrayBuffer 데이터수
        if (_rxBuf.length > 30) _rxBuf = [];

        for (var index = 0; index < len; index++) {
            var c = bytes[index];
            _rxBuf.push(c);

            if (_rxBuf.length >= 2) {
                if (_rxBuf[_rxBuf.length - 1] == 0x55 && _rxBuf[_rxBuf.length - 2] == 0xff) {
                    _isParseStart = true;
                    _isParseStartIndex = _rxBuf.length - 2;
                }//if

                if (_rxBuf[_rxBuf.length - 1] == 0xa && _rxBuf[_rxBuf.length - 2] == 0xd && _isParseStart) {
                    _isParseStart = false;

                    var poisition = _isParseStartIndex + 2;
                    var extId = _rxBuf[position];
                    position++;
                    var type = _rxBuf[position];
                    position++;

                    //1 byte, 2 float, 3 short, 4 len+string, 5 double
                    var value;
                    switch (type) {
                        case 1:
                            value = _rxBuf[position];
                            position++;
                            break;
                        case 2:
                            value = readFloat(_rxBuf, position);
                            position += 4;
                            if (value < -255 || value > 1023) value = 0;
                            break;
                        case 3:
                            value = readShort(_rxBuf, position);
                            position += 2;
                            break;
                        case 4:
                            var l = _rxBuf[position];
                            position++;
                            value = readString(_rxBuf, position, l);
                            break;
                        case 5:
                            value = readDouble(_rxBuf, position);
                            position += 4;
                            break;
                    }//switch

                    if (type <= 5) {
                        if (values[extId] != undefined) {
                            responseValue(extId, values[extId](value, extId));
                        }
                        else {
                            responseValue(extId, value);
                        }

                        values[extId] = null;
                    }//if

                    _rxBuf = [];
                }//if
            }//if
        }//for
    }//function

    function readFloat(arr, position) {
        var f = [arr[position], arr[position + 1], arr[position + 2], arr[position + 3]];
        return parseFloat(f);
    }//function

    function readShort(arr, position) {
        var s = [arr[postion], arr[postion + 1]];
        return parseShort(s);
    }//furnction

    function readDouble(arr, position) {
        return readFloat(arr, position);
    }//function

    function readString(arr, position, len) {
        var value = "";
        for (var ii = 0; ii < len; ii++) {
            value += String.fromCharCode(_rxBuf[ii + position]);
        }//for

        return value;
    }//function//////////////////////////////////////////////////////////
};

Module.prototype.handleLocalData = function(data) { // data: Native Buffer
	var pointer = 0;
	for (var i = 0; i < 32; i++) {
		var chunk;
		if(!this.remainValue) {
			chunk = data[i];
		} else {			
			chunk = this.remainValue;
			i--;
		}
		if (chunk >> 7) {
			if ((chunk >> 6) & 1) {
				var nextChunk = data[i + 1];
				if(!nextChunk && nextChunk !== 0) {
					this.remainValue = chunk;
				} else {
					this.remainValue = null;

					var port = (chunk >> 3) & 7;
					this.analogValue[port] = ((chunk & 7) << 7) +
						(nextChunk & 127);
				}				
		    	i++;
			} else {
				var port = (chunk >> 2) & 15;
				this.digitalValue[port] = chunk & 1;
			}
		}
	}
};

Module.prototype.requestRemoteData = function(handler) {
	for (var i = 0; i < this.analogValue.length; i++) {
		var value = this.analogValue[i];
		handler.write('a' + i, value);
	}
	for (var i = 0; i < this.digitalValue.length; i++) {
		var value = this.digitalValue[i];
		handler.write(i, value);
	}
};

Module.prototype.reset = function() {
};

module.exports = new Module();
