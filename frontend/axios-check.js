const { AxiosHeaders } = require('axios')
const axios = require('axios')

const api = axios.create({ baseURL: '/api/v1' })

const form = new FormData()
form.append('title', 'Hello')
form.append('content', 'World')
form.append('tag_id', '2')
form.append('images', new Blob(['abc']), 'a.png')

const req1 = api.interceptors.request.use((config) => config)

const config = { method: 'post', url: '/posts', data: form }
const resolved = api.defaults.transformRequest.reduce((data, fn) => fn.call(api, data, new AxiosHeaders({}), api.defaults), config.data)
const h = new AxiosHeaders()
api.defaults.transformRequest.forEach((fn) => fn.call(api, config.data, h, api.defaults))

// check Content-Type after transform for FormData
const headers = new AxiosHeaders()
const out = api.defaults.transformRequest.reduce((d, fn) => fn.call(api, d, headers, api.defaults), form)
console.log('FormData result:', out instanceof FormData ? 'KEPT AS FormData (multipart OK)' : typeof out)
console.log('FormData content-type:', headers.getContentType())

// object payload
const h2 = new AxiosHeaders()
const out2 = api.defaults.transformRequest.reduce((d, fn) => fn.call(api, d, h2, api.defaults), { title: 'x', tag_id: 2 })
console.log('Object result:', out2)
console.log('Object content-type:', h2.getContentType())
