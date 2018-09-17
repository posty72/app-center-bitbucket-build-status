const request = require('request-promise');
require('dotenv').config();

const BUILD_STATES = {
    successful: 'SUCCESSFUL',
    failed:     'FAILED',
    inprogress: 'INPROGRESS',
    stopped:    'STOPPED',
};

module.exports.buildStatus = (event, context, callback) => {
    const requestBody = JSON.parse(event.body);
    const uri = `https://api.bitbucket.org/2.0/repositories/${process.env.BITBUCKET_USER}/${process.env.BITBUCKET_REPO}/commit/${requestBody.source_version}/statuses/build`;
    const data = {
        'state': getBuildStatus(requestBody.build_status),
        'key':   `${process.env.APP_NAME}-build-${requestBody.build_id}`,
        'url':   requestBody.build_link,
        'uuid':  requestBody.source_version,
    };

    getAccess().then((response) => {
        const accessToken = response.access_token;

        request({
            uri,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            json:   true,
            method: 'POST',
            body:   data,
        })
            .then((response) => {
                if (response.errorMessage) {
                    throw new Error(response.errorMessage);
                }

                callback(null, 'Success!');
            })
            .catch(({ error }) => {
                console.error(error);
                callback(error);
            });
    }).catch((error) => {
        console.error(error);
        callback(error);
    });
};

function getBuildStatus(status) {
    if (!status) {
        return BUILD_STATES.failed;
    }

    switch (status.toLowerCase()) {
        case 'inprogress':
            return BUILD_STATES.inprogress;
        case 'succeeded':
            return BUILD_STATES.successful;
        case 'failed':
            return BUILD_STATES.failed;
        default:
            return BUILD_STATES.failed;
    }
}

function getAccess() {
    return new Promise((resolve, reject) => {
        request({
            uri:    'https://bitbucket.org/site/oauth2/access_token',
            method: 'POST',
            json:   true,
            form:   {
                'grant_type': 'client_credentials',
            },
            auth: {
                user: process.env.BITBUCKET_CLIENT_ID,
                pass: process.env.BITBUCKET_SECRET,
            },
        })
            .then((response) => resolve(response))
            .catch((error) => reject(error));
    });
}
