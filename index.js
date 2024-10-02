console.log("hi")
localStorage.clear()

let tweetInput = document.getElementById('tweetInput')
let tweetButton = document.getElementById('tweetButton');
let tweetsList = document.getElementById('tweets');

async function fetchFile(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.text();
    return data;
  } catch (error) {
    console.error('Error fetching text data:', error);
  }
}

async function fetchJSON(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching JSON:', error);
  }
}

let GCFS_API = "https://preprod-gcfs.onrender.com";
function fetchAllPosts(data, callback) {
  const postsPs = data.map(resourceUrl => fetchFile(`${GCFS_API}${resourceUrl}`)
    .then(content => callback(resourceUrl, content))
  );
}

async function setTweet(tweetObject) {
  const gc = window.gc

  let tweetData = tweetInput.value;
  let tweetDataBase64 = gc.utils.Buffer.from(tweetData).toString("hex")

  console.log(tweetDataBase64);

  let gcscript =
  {
    "title": "Upload to GCFS",
    "description": "You are about to upload selected files to a GCFS Disk named 'raven'",
    "type": "script",
    "args": {
      "postDataHex": tweetDataBase64
    },
    "run": {
      "postId": {
        "type": "macro",
        "run": "{truncate(uuid(),0,12,'')}"
      },
      "fs": {
        "type": "macro",
        "run": [
          {
            "{replaceAll('//POST_ID.post.json','POST_ID',get('cache.postId'))}": {
              "kind": "file",
              "fileHex": "{get('args.postDataHex')}"
            }
          }
        ]
      },
      "buildTxs": {
        "type": "buildFsTxs",
        "description": "Raven permatweet",
        "assetName": "raven",
        "replicas": "1",
        "layers": "{get('cache.fs')}"
      },
      "signTxs": {
        "detailedPermissions": false,
        "type": "signTxs",
        "namePattern": "GCFS_Signed_{key}",
        "txs": "{get('cache.buildTxs.txList')}"
      },
      "submitTxs": {
        "type": "submitTxs",
        "mode": "parallel",
        "namePattern": "GCFS_Submitted{key}",
        "txs": "{get('cache.signTxs')}"
      },
      "finally": {
        "type": "script",
        "exportAs": "buildFs",
        "run": {
          "txs": {
            "type": "macro",
            "run": "{get('cache.submitTxs')}"
          }
        }
      }
    }
  }

  let network_type = "preprod";
  console.log(gcscript);
  const actionUrl = await gc.encode.url({
    input: JSON.stringify(gcscript),
    apiVersion: '2',
    network: network_type
  })

  if (actionUrl) {
    tweetButton.setAttribute("href", actionUrl)
  }
}

async function main() {
    const postCache = {}
    let userId = "386bec6c6199a40890abd7604b60bf43089d9fb1120a3d42198946b9"
    // const url = `https://preprod-gcfs.onrender.com/search/?query=[{"policyId":"${userId}","keyWord":".post.json"}]&format=url`;
    const url = `https://preprod-gcfs.onrender.com/search/?query=[{"policyId":"${userId}", "assetName": "raven"}]&format=url&foo=bar`;
    let list = (await fetchJSON(url)).items;
    console.log(list)

    async function updateUI() {
      console.log(postCache);
      const postsElements = Object.entries(postCache).map(([url, content]) => {
        console.log("https://preprod-gcfs.onrender.com" + url);
        return `<div class="post" title="${url}">${content}</div>`
      })
      tweetsList.innerHTML = `<div>${postsElements.join("")}</div>`;
    }

    fetchAllPosts(list, (url, content) => {
      postCache[url] = content
      updateUI();
    });
}

window.onload = function () {
  main();
}

