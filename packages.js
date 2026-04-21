import https from 'node:https'
import url from 'node:url'

function parseGithubDownloadData(str) {
  try {
    return JSON.parse(str)
  } catch(err) {
    console.error(err)
    return null
  }
}

function getVCPkg(repoURL) {

  const repo = url.parse(repoURL)

  const req =https.request({
    protocol: repo.protocol,
    host: repo.host,
    path: repo.path,
    method: "GET",
    headers: {
      "user-agent": "node.js"
    },
  }, (res) => {
    let cache = ""
    res.on("data", (chunk) => {
      cache += chunk
    })

    res.on("end", () => {
      // const data = parseGithubDownloadData(cache)
      // const downloadURL = data?.assets?.[0]?.browser_download_url
      // if (!downloadURL) {
      //   console.error("Cannot get the downloadURL")
      //   return
      // }
      // download(downloadURL)
    })
  },)

  req.end()

}

function formatArgv(argv) {
  const res = {}
  let args = [...argv]
  args.splice(0, 2)

  args.forEach(val => {
    let [key, value] = val.split("=")
    res[key] = value
  })

  return res
}

function main() {
  let args = [...process.argv]
  args.splice(0, 2)

  const type = args.splice(0, 1)[0]

  if (!type) {
    console.error("lack of type parameter");
    return;
  }

  switch (type) {
    case "get":
      const url = args.splice(0, 1)[0];
      getVCPkg(url);
      break;
  }

}

main()
