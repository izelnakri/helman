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
```

### Usage

```sh
helman init
# -> creates npm/package.json like helm.json, helm_charts folder and k8s folder for kustomize

helman install jetstack/cert-manager
# -> saves latest cert-manager chart to helm_charts folder
# -> saves the installed version to helm.json
# -> creates k8s/bases/cert-manager/kustomization.yaml folder and links it to k8s/bases/kustomization.yaml
# -> builds the jetstack/cert-manager helm chart and creates k8s/bases/cert-manager/helm.yaml
# -> links k8s/bases/cert-manager/helm.yaml to k8s/bases/cert-manager/kustomization.yaml

# in case if jetstack/cert-manager isnt in your helm repo:
helm repo add jetstack https://charts.jetstack.io && helman install jetstack/cert-manager

helman install stable/prometheus v0.8.1
# -> saves v0.8.1 prometheus chart to helm_charts folder
# -> saves the installed version to helm.json
# -> creates k8s/bases/prometheus/kustomization.yaml folder and links it to k8s/bases/kustomization.yaml
# -> builds the stable/prometheus helm chart and creates k8s/bases/prometheus/helm.yaml
# -> links k8s/bases/prometheus/helm.yaml to k8s/bases/prometheus/kustomization.yaml

helman build
# -> reads all the helm charts on helm.json and starts building their helm template outputs:
# -> rebuilds jetstack/cert-manager to k8s/bases/cert-manager/helm.yaml
# -> rebuilds stable/prometheus to k8s/bases/prometheus/helm.yaml

helman uninstall jetstack/cert-manager
# -> removes jetstack/cert-manager from helm_charts
# -> removes jetstack/cert-manager from helm.json
# -> removes k8s/bases/cert-manager

rm -rf helm_charts && helman install
# -> resets/reinstalls helm_charts folder with defined charts on helm.json and rebuilds them
```

