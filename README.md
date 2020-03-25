# Helman: Kubernetes Kustomize <> Helm

The package manager layer on top of Helm and Kubernetes. Allows for helm chart based kustomizations.
I hope functionality described in this cli tool will be a part of `helm` cli in future.
In the meantime, this cli tool provides an essential complixity management to helm and kustomize workflows.

### System Requirements

- helm
- kubectl

### Installation

```sh
npm install -g helman

helman help

helman init # creates npm-package.json like helm.json and helm_charts folder

helman install jetstack/cert-manager
# -> looks up and adds jetstack repo to helm if doesnt exists,
# -> saves latest cert-manager chart to helm_charts folder

helman install stable/prometheus v0.8.1
# -> saves v0.8.1 cert-manager chart to helm_charts folder

helman install stable/nginx-ingress --save
# -> looks up stable helm repo nginx-ingress chart,
# -> fetches the last version of nginx-ingress chart
# -> saves it to helm.json if doesnt exists

rm -rf helm_charts && helman install
# -> resets helm_charts folder with defined charts on helm.json
```

