
const Readable = require('stream').Readable;
const util = require('util');
const got = require('got');
const url = require('url');

util.inherits(JenkinsOutput, Readable);

function JenkinsOutput(options) {
    Readable.call(this, options);
    this._baseUrl = options.baseUrl;
    this._job = options.job;
    this._build = options.build || 'lastBuild';
    this._url = url.parse(
	this._baseUrl + '/job/' + this._job + '/' + this._build +
	    '/logText/progressiveText'
    );
    this._n = 0;
    this._pollInterval = options.pollInterval || 1000;
}

JenkinsOutput.prototype._read = function() {
    var self = this;
    if (this._done) { self.push(null); }

    function get() {

	var url = self._url.protocol + '//' + self._url.host +
	    self._url.path;

	got.get(url, {
	    auth: self._url.auth,
	    query: { 'start': self._n }	})

	    .then(function(response) {
		self._n = response.headers['x-text-size'];

		if (response.body.length > 0) {
		    // If there is data, then push it and we are done
		    return self.push(response.body);

		} else if (response.headers['x-more-data'] !== 'true') {
		    // If log if complete, then end the stream
		    self.push(null);

		} else if (response.body.length == 0) {
		    // If there will be more data in the future,
		    // then try to poll again in three seconds.
		    setTimeout(get, self.pollInterval);
		}
	    })

	    .catch(function(error) {
		// ignore errors for now, we just keep polling
		setTimeout(get, self.pollInterval);
	    });
    }

    get();
}

module.exports = JenkinsOutput;
