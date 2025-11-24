# ManifestIT API Test Report
**Date:** November 21, 2025  
**Base URL:** https://dev.api.manifestit.tech  
**Organization:** dev

---

## Test Configuration
```bash
BASE_URL="https://dev.api.manifestit.tech"
API_KEY="your-api-key"
ORG_KEY="dev"
```

---


## 1. RESOURCES

### 1.1 Get All Resources
**Endpoint:** `GET /client/resource`  
**Purpose:** Get all resources in organization

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/resource?page=1&page_size=5" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.[0]'
```

**Sample Response:**
{
  "id": 46793579,
  "organizationId": 1,
  "orgKey": "dev",
  "resourceId": "eni-0aceaa90117da7389",
  "resourceName": "eni-0aceaa90117da7389",
  "resourceCategory": "CLOUD",
  "resourceStatus": "ACTIVE",
  "resourceCost": null,
  "resourceType": "Ec2",
  "resourceSubType": "AWS::EC2::NetworkInterface",
  "resourceOwner": "",
  "resourceRegion": "us-west-2",
  "resourceAccountName": "mit-non-prod-tenant",
  "resourceOsName": null,
  "resourceOsVersion": null,
  "resourcePatchStatus": null,
  "resourcePhysicalAddress": null,
  "resourceCriticality": null,
  "isManaged": false,
  "providerId": 1,
  "providerKey": "aws",
  "sourceRefUri": "https://us-west-2.console.aws.amazon.com/ec2/home?region=us-west-2#NetworkInterface:networkInterfaceId=eni-0aceaa90117da7389",
  "sourceRef": "eni-0aceaa90117da7389",
  "vpcId": "495462907305",
  "metadata": {},
  "tags": {},
  "isActive": true,
  "watch": null,
  "watchLevel": null,
  "key1": null,
  "key2": null,
  "key3": null,
  "key4": null,
  "key5": "|",
  "createDate": "2025-11-15T14:50:43.42021Z",
  "updateDate": null,
  "createdAt": "2025-11-15T14:50:12.450625Z",
  "updatedAt": "2025-11-21T19:35:51.992702Z",
  "providerConfigurationId": 605,
  "parentId": null,
  "resourceOwnerId": null,
  "securityPosture": 0,
  "flagged": false,
  "label": null,
  "initiateResolution": null,
  "notifyUsers": null,
  "consumerAccountId": null,
  "metricsMetadata": {},
  "display": true,
  "branches": null,
  "businessService": {},
  "microService": {},
  "cmdbCiId": null,
  "cmdbCiName": null,
  "cmdbCiSourceRef": null,
  "cmdbCiSourceUri": null,
  "cmdbSource": null,
  "publisherId": null,
  "miscellaneous": null,
  "breadcrumb": "Cloud|AWS|mit-non-prod-tenant|Ec2|AWS::EC2::NetworkInterface",
  "eventNotificationSettings": {},
  "alertNotificationSettings": {},
  "insightNotificationSettings": {},
  "provider": null,
  "organization": null,
  "resource_metadatum": null,
  "change_log": null,
  "user": null,
  "children": null
}

---


### 1.2 Get Resource by ID
**Endpoint:** `GET /client/resource/{rid}`  
**Purpose:** Get a particular resource with a resource id

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/resource/107" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.'
```

**Sample Response:**
{
  "id": 0,
  "organizationId": null,
  "orgKey": "",
  "resourceId": "",
  "resourceName": null,
  "resourceCategory": "",
  "resourceStatus": null,
  "resourceCost": null,
  "resourceType": "",
  "resourceSubType": "",
  "resourceOwner": null,
  "resourceRegion": null,
  "resourceAccountName": "",
  "resourceOsName": null,
  "resourceOsVersion": null,
  "resourcePatchStatus": null,
  "resourcePhysicalAddress": null,
  "resourceCriticality": null,
  "isManaged": false,
  "providerId": null,
  "providerKey": "",
  "sourceRefUri": null,
  "sourceRef": null,
  "vpcId": null,
  "metadata": null,
  "tags": null,
  "isActive": false,
  "watch": null,
  "watchLevel": null,
  "key1": null,
  "key2": null,
  "key3": null,
  "key4": null,
  "key5": null,
  "createDate": null,
  "updateDate": null,
  "createdAt": null,
  "updatedAt": null,
  "providerConfigurationId": 0,
  "parentId": null,
  "resourceOwnerId": null,
  "securityPosture": 0,
  "flagged": false,
  "label": null,
  "initiateResolution": null,
  "notifyUsers": null,
  "consumerAccountId": null,
  "metricsMetadata": null,
  "display": null,
  "branches": null,
  "businessService": null,
  "microService": null,
  "cmdbCiId": null,
  "cmdbCiName": null,
  "cmdbCiSourceRef": null,
  "cmdbCiSourceUri": null,
  "cmdbSource": null,
  "publisherId": null,
  "miscellaneous": null,
  "breadcrumb": "",
  "eventNotificationSettings": null,
  "alertNotificationSettings": null,
  "insightNotificationSettings": null,
  "provider": null,
  "organization": null,
  "resource_metadatum": null,
  "change_log": null,
  "user": null,
  "children": null,
  "changelogCount": 0,
  "serviceRequestCount": 0,
  "incidentCount": 0,
  "situationCount": 0,
  "notificationCount": 0,
  "resourceCount": 0,
  "resourceNotifications": null,
  "applications": [],
  "score": 0,
  "resourceMetrics": {
    "baseline": null,
    "current": null,
    "latest": false
  },
  "components": null
}

---


### 1.3 Get Tickets for Resource
**Endpoint:** `GET /client/resource/{rid}/ticket`  
**Purpose:** Get all tickets associated with a resource

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/resource/107/ticket" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.[0]'
```

**Sample Response:**
null

---


### 1.4 Search Resources
**Endpoint:** `GET /client/resource/search`  
**Purpose:** Searches resources within an organization

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/resource/search?page=1&page_size=3" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.[0]'
```

**Sample Response:**
{
  "id": 46080700,
  "organizationId": 1,
  "orgKey": "",
  "resourceId": "6c506532-47ba-42da-9fb6-9ab00f7cbc6a",
  "resourceName": "uptime-kuma-dcdc55696-8g5fd",
  "resourceCategory": "CONTAINER_ORCHESTRATOR",
  "resourceStatus": "Active",
  "resourceCost": null,
  "resourceType": "Workload",
  "resourceSubType": "Pod",
  "resourceOwner": null,
  "resourceRegion": null,
  "resourceAccountName": "",
  "resourceOsName": null,
  "resourceOsVersion": null,
  "resourcePatchStatus": null,
  "resourcePhysicalAddress": null,
  "resourceCriticality": null,
  "isManaged": false,
  "providerId": 31,
  "providerKey": "kubernetes",
  "sourceRefUri": "6c506532-47ba-42da-9fb6-9ab00f7cbc6a",
  "sourceRef": "6c506532-47ba-42da-9fb6-9ab00f7cbc6a",
  "vpcId": null,
  "metadata": {
    "kind": "Pod",
    "spec": {
      "volumes": [
        {
          "name": "kube-api-access-8mqkj",
          "projected": {
            "sources": [
              {
                "serviceAccountToken": {
                  "path": "token",
                  "expirationSeconds": 3607
                }
              },
              {
                "configMap": {
                  "name": "kube-root-ca.crt",
                  "items": [
                    {
                      "key": "ca.crt",
                      "path": "ca.crt"
                    }
                  ]
                }
              },
              {
                "downwardAPI": {
                  "items": [
                    {
                      "path": "namespace",
                      "fieldRef": {
                        "fieldPath": "metadata.namespace",
                        "apiVersion": "v1"
                      }
                    }
                  ]
                }
              }
            ],
            "defaultMode": 420
          }
        }
      ],
      "nodeName": "gke-mit-acme-mit-default-49215528-5xlt",
      "priority": 0,
      "dnsPolicy": "ClusterFirst",
      "containers": [
        {
          "name": "uptimekuma",
          "image": "louislam/uptime-kuma:1.23.13-debian",
          "ports": [
            {
              "name": "http",
              "protocol": "TCP",
              "containerPort": 3001
            }
          ],
          "resources": {
            "limits": {
              "cpu": "256m",
              "memory": "320Mi"
            },
            "requests": {
              "cpu": "232m",
              "memory": "300Mi"
            }
          },
          "volumeMounts": [
            {
              "name": "kube-api-access-8mqkj",
              "readOnly": true,
              "mountPath": "/var/run/secrets/kubernetes.io/serviceaccount"
            }
          ],
          "livenessProbe": {
            "httpGet": {
              "path": "/",
              "port": "http",
              "scheme": "HTTP"
            },
            "periodSeconds": 10,
            "timeoutSeconds": 1,
            "failureThreshold": 3,
            "successThreshold": 1
          },
          "readinessProbe": {
            "httpGet": {
              "path": "/",
              "port": "http",
              "scheme": "HTTP"
            },
            "periodSeconds": 10,
            "timeoutSeconds": 1,
            "failureThreshold": 3,
            "successThreshold": 1
          },
          "imagePullPolicy": "IfNotPresent",
          "securityContext": {},
          "terminationMessagePath": "/dev/termination-log",
          "terminationMessagePolicy": "File"
        }
      ],
      "tolerations": [
        {
          "key": "node.kubernetes.io/not-ready",
          "effect": "NoExecute",
          "operator": "Exists",
          "tolerationSeconds": 300
        },
        {
          "key": "node.kubernetes.io/unreachable",
          "effect": "NoExecute",
          "operator": "Exists",
          "tolerationSeconds": 300
        }
      ],
      "restartPolicy": "Always",
      "schedulerName": "default-scheduler",
      "readinessGates": [
        {
          "conditionType": "cloud.google.com/load-balancer-neg-ready"
        }
      ],
      "serviceAccount": "uptime-kuma",
      "securityContext": {},
      "preemptionPolicy": "PreemptLowerPriority",
      "enableServiceLinks": true,
      "serviceAccountName": "uptime-kuma",
      "terminationGracePeriodSeconds": 30
    },
    "status": {
      "phase": "Running",
      "podIP": "192.168.5.19",
      "hostIP": "10.0.1.81",
      "podIPs": [
        {
          "ip": "192.168.5.19"
        }
      ],
      "hostIPs": [
        {
          "ip": "10.0.1.81"
        }
      ],
      "qosClass": "Burstable",
      "startTime": "2025-07-11T07:08:16Z",
      "conditions": [
        {
          "type": "cloud.google.com/load-balancer-neg-ready",
          "reason": "LoadBalancerNegWithoutHealthCheck",
          "status": "True",
          "message": "Pod is in NEG \"Key{\\\"k8s1-aa45dd33-uptime-kuma-uptime-kuma-3001-573e3f61\\\", zone: \\\"us-central1-a\\\"}\". NEG is not attached to any BackendService with health checking. Marking condition \"cloud.google.com/load-balancer-neg-ready\" to True.",
          "lastProbeTime": null,
          "lastTransitionTime": null
        },
        {
          "type": "PodReadyToStartContainers",
          "status": "True",
          "lastProbeTime": null,
          "lastTransitionTime": "2025-07-11T07:08:30Z"
        },
        {
          "type": "Initialized",
          "status": "True",
          "lastProbeTime": null,
          "lastTransitionTime": "2025-07-11T07:08:16Z"
        },
        {
          "type": "Ready",
          "status": "True",
          "lastProbeTime": null,
          "lastTransitionTime": "2025-07-11T07:08:52Z"
        },
        {
          "type": "ContainersReady",
          "status": "True",
          "lastProbeTime": null,
          "lastTransitionTime": "2025-07-11T07:08:52Z"
        },
        {
          "type": "PodScheduled",
          "status": "True",
          "lastProbeTime": null,
          "lastTransitionTime": "2025-07-11T07:08:16Z"
        }
      ],
      "containerStatuses": [
        {
          "name": "uptimekuma",
          "image": "docker.io/louislam/uptime-kuma:1.23.13-debian",
          "ready": true,
          "state": {
            "running": {
              "startedAt": "2025-07-11T07:08:30Z"
            }
          },
          "imageID": "docker.io/louislam/uptime-kuma@sha256:96510915e6be539b76bcba2e6873591c67aca8a6075ff09f5b4723ae47f333fc",
          "started": true,
          "lastState": {},
          "containerID": "containerd://5abd1d1716a2e456816a362a34b6e7ab8751c52a6387fd8ea66b8b73a1cd7c59",
          "restartCount": 0,
          "volumeMounts": [
            {
              "name": "kube-api-access-8mqkj",
              "readOnly": true,
              "mountPath": "/var/run/secrets/kubernetes.io/serviceaccount",
              "recursiveReadOnly": "Disabled"
            }
          ]
        }
      ]
    },
    "metadata": {
      "uid": "6c506532-47ba-42da-9fb6-9ab00f7cbc6a",
      "name": "uptime-kuma-dcdc55696-8g5fd",
      "labels": {
        "pod-template-hash": "dcdc55696",
        "app.kubernetes.io/name": "uptime-kuma",
        "app.kubernetes.io/instance": "uptime-kuma"
      },
      "namespace": "uptime-kuma",
      "generation": 1,
      "generateName": "uptime-kuma-dcdc55696-",
      "managedFields": [
        {
          "time": "2025-07-11T07:08:12Z",
          "manager": "kube-controller-manager",
          "fieldsV1": {
            "f:spec": {
              "f:dnsPolicy": {},
              "f:containers": {
                "k:{\"name\":\"uptimekuma\"}": {
                  ".": {},
                  "f:name": {},
                  "f:image": {},
                  "f:ports": {
                    ".": {},
                    "k:{\"containerPort\":3001,\"protocol\":\"TCP\"}": {
                      ".": {},
                      "f:name": {},
                      "f:protocol": {},
                      "f:containerPort": {}
                    }
                  },
                  "f:resources": {
                    ".": {},
                    "f:limits": {
                      ".": {},
                      "f:cpu": {},
                      "f:memory": {}
                    },
                    "f:requests": {
                      ".": {},
                      "f:cpu": {},
                      "f:memory": {}
                    }
                  },
                  "f:livenessProbe": {
                    ".": {},
                    "f:httpGet": {
                      ".": {},
                      "f:path": {},
                      "f:port": {},
                      "f:scheme": {}
                    },
                    "f:periodSeconds": {},
                    "f:timeoutSeconds": {},
                    "f:failureThreshold": {},
                    "f:successThreshold": {}
                  },
                  "f:readinessProbe": {
                    ".": {},
                    "f:httpGet": {
                      ".": {},
                      "f:path": {},
                      "f:port": {},
                      "f:scheme": {}
                    },
                    "f:periodSeconds": {},
                    "f:timeoutSeconds": {},
                    "f:failureThreshold": {},
                    "f:successThreshold": {}
                  },
                  "f:imagePullPolicy": {},
                  "f:securityContext": {},
                  "f:terminationMessagePath": {},
                  "f:terminationMessagePolicy": {}
                }
              },
              "f:restartPolicy": {},
              "f:schedulerName": {},
              "f:serviceAccount": {},
              "f:securityContext": {},
              "f:enableServiceLinks": {},
              "f:serviceAccountName": {},
              "f:terminationGracePeriodSeconds": {}
            },
            "f:metadata": {
              "f:labels": {
                ".": {},
                "f:pod-template-hash": {},
                "f:app.kubernetes.io/name": {},
                "f:app.kubernetes.io/instance": {}
              },
              "f:generateName": {},
              "f:ownerReferences": {
                ".": {},
                "k:{\"uid\":\"34f32bd6-ef74-43b9-8134-9c87f405a5e7\"}": {}
              }
            }
          },
          "operation": "Update",
          "apiVersion": "v1",
          "fieldsType": "FieldsV1"
        },
        {
          "time": "2025-07-11T07:08:33Z",
          "manager": "glbc",
          "fieldsV1": {
            "f:status": {
              "f:conditions": {
                ".": {},
                "k:{\"type\":\"cloud.google.com/load-balancer-neg-ready\"}": {
                  ".": {},
                  "f:type": {},
                  "f:reason": {},
                  "f:status": {},
                  "f:message": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {}
                }
              }
            }
          },
          "operation": "Update",
          "apiVersion": "v1",
          "fieldsType": "FieldsV1",
          "subresource": "status"
        },
        {
          "time": "2025-07-11T07:08:52Z",
          "manager": "kubelet",
          "fieldsV1": {
            "f:status": {
              "f:phase": {},
              "f:podIP": {},
              "f:hostIP": {},
              "f:podIPs": {
                ".": {},
                "k:{\"ip\":\"192.168.5.19\"}": {
                  ".": {},
                  "f:ip": {}
                }
              },
              "f:hostIPs": {},
              "f:startTime": {},
              "f:conditions": {
                "k:{\"type\":\"Ready\"}": {
                  ".": {},
                  "f:type": {},
                  "f:status": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {}
                },
                "k:{\"type\":\"Initialized\"}": {
                  ".": {},
                  "f:type": {},
                  "f:status": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {}
                },
                "k:{\"type\":\"ContainersReady\"}": {
                  ".": {},
                  "f:type": {},
                  "f:status": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {}
                },
                "k:{\"type\":\"PodReadyToStartContainers\"}": {
                  ".": {},
                  "f:type": {},
                  "f:status": {},
                  "f:lastProbeTime": {},
                  "f:lastTransitionTime": {}
                }
              },
              "f:containerStatuses": {}
            }
          },
          "operation": "Update",
          "apiVersion": "v1",
          "fieldsType": "FieldsV1",
          "subresource": "status"
        }
      ],
      "ownerReferences": [
        {
          "uid": "34f32bd6-ef74-43b9-8134-9c87f405a5e7",
          "kind": "ReplicaSet",
          "name": "uptime-kuma-dcdc55696",
          "apiVersion": "apps/v1",
          "controller": true,
          "blockOwnerDeletion": true
        }
      ],
      "resourceVersion": "1752217732942623003",
      "creationTimestamp": "2025-07-11T07:08:14Z"
    },
    "apiVersion": "v1",
    "resourceType": "Workload"
  },
  "tags": [
    {
      "Key": "app",
      "Value": "uptime-kuma"
    },
    {
      "Key": "namespace",
      "Value": "uptime-kuma"
    },
    {
      "Key": "node",
      "Value": "gke-mit-acme-mit-default-49215528-5xlt"
    },
    {
      "Key": "serviceAccount",
      "Value": "uptime-kuma"
    },
    {
      "Key": "ip_address",
      "Value": "192.168.5.19"
    },
    {
      "Key": "ip_address",
      "Value": "10.0.1.81"
    },
    {
      "Key": "app.kubernetes.io/instance",
      "Value": "uptime-kuma"
    },
    {
      "Key": "app.kubernetes.io/name",
      "Value": "uptime-kuma"
    },
    {
      "Key": "pod-template-hash",
      "Value": "dcdc55696"
    }
  ],
  "isActive": true,
  "watch": null,
  "watchLevel": null,
  "key1": "uptime-kuma",
  "key2": null,
  "key3": "sha256:96510915e6be539b76bcba2e6873591c67aca8a6075ff09f5b4723ae47f333fc",
  "key4": "ReplicaSet",
  "key5": "34f32bd6-ef74-43b9-8134-9c87f405a5e7",
  "createDate": "2025-07-11T07:08:14Z",
  "updateDate": null,
  "createdAt": "2025-11-12T05:04:43.94985Z",
  "updatedAt": "2025-11-21T19:36:24.821368Z",
  "providerConfigurationId": 633,
  "parentId": null,
  "resourceOwnerId": null,
  "securityPosture": 0,
  "flagged": false,
  "label": null,
  "initiateResolution": null,
  "notifyUsers": null,
  "consumerAccountId": null,
  "metricsMetadata": {
    "ns": "uptime-kuma",
    "uid": "",
    "name": "uptime-kuma-dcdc55696-8g5fd",
    "cpu_m": 3,
    "mem_mib": 139,
    "subtype": "Pod"
  },
  "display": null,
  "branches": null,
  "businessService": {},
  "microService": {},
  "cmdbCiId": null,
  "cmdbCiName": null,
  "cmdbCiSourceRef": null,
  "cmdbCiSourceUri": null,
  "cmdbSource": null,
  "publisherId": null,
  "miscellaneous": null,
  "breadcrumb": "ContainerOrchestrator|Kubernetes|Dev Cluster|Workload|Pod",
  "eventNotificationSettings": null,
  "alertNotificationSettings": null,
  "insightNotificationSettings": null,
  "provider": null,
  "organization": null,
  "resource_metadatum": null,
  "change_log": null,
  "user": null,
  "children": null,
  "changelogCount": 1,
  "serviceRequestCount": 0,
  "incidentCount": 0,
  "situationCount": 0,
  "notificationCount": 0,
  "resourceCount": 0,
  "applications": [
    {
      "id": 758430,
      "applicationId": 170,
      "resourceId": 46080700,
      "organizationId": 1,
      "orgKey": "",
      "source": "API",
      "type": "",
      "isActive": true,
      "createdAt": "2025-11-17T11:09:32.72564Z",
      "updatedAt": "2025-11-17T11:09:32.72564Z",
      "applicationEnvironmentId": 181,
      "organization": null,
      "application": {
        "id": 170,
        "name": "Mit test ",
        "description": null,
        "appGroupId": 1,
        "organizationId": 1,
        "orgKey": "dev",
        "criticality": "",
        "capability": "",
        "impact": null,
        "complianceStandards": null,
        "systemOwner": 0,
        "processOwner": 0,
        "dataOwner": 1586,
        "source": "API",
        "key1": null,
        "key2": null,
        "key3": null,
        "key4": null,
        "key5": null,
        "isActive": true,
        "createdAt": "2025-11-17T11:09:31.856744Z",
        "updatedAt": "2025-11-17T11:09:31.856744Z",
        "serviceId": "MITTEST-7fb8671c",
        "isSuggested": null,
        "tagCombination": null,
        "serviceEndpoint": null,
        "jaegerServiceName": null,
        "parent": null,
        "serviceChildren": null,
        "serviceType": "business_service",
        "watched": false,
        "serviceParent": null,
        "flagged": false,
        "apmLogSourceId": null,
        "apmMetricSourceId": null,
        "apmEventSourceId": null,
        "preferences": {},
        "eventNotificationSettings": {},
        "alertNotificationSettings": {},
        "insightNotificationSettings": {},
        "organization": null,
        "app_group": null,
        "system_owner_user": null,
        "process_owner_user": null,
        "data_owner_user": null,
        "children": null,
        "apmLogSource": null,
        "apmMetricSource": null,
        "apmEventSource": null
      },
      "resource": null
    }
  ]
}

---


## 2. CHANGELOGS

### 2.1 Get All Changelogs
**Endpoint:** `GET /client/changelog`  
**Purpose:** Get list of all change logs in the organization

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/changelog?page=1&page_size=3" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.[0]'
```

**Sample Response:**
{
  "id": "",
  "organizationId": 0,
  "providerKey": "",
  "providerConfigurationId": 0,
  "derivedType": "",
  "eventType": "",
  "eventCategory": "",
  "severity": "",
  "metadata": null,
  "description": null,
  "sourceRef": null,
  "sourceRefUri": null,
  "triggeredAt": "0001-01-01T00:00:00Z",
  "createDate": null,
  "updateDate": null,
  "createdAt": null,
  "updatedAt": null,
  "sourceIp": null,
  "recipientAccountId": null,
  "source": null,
  "region": null,
  "type": "",
  "isCurated": false,
  "isActorHuman": false,
  "display": null,
  "isActive": false,
  "ignore": false,
  "isLifecycleEvent": false,
  "changelog_resource": null,
  "changelog_user": null,
  "changelogUserResource": null,
  "userIds": null,
  "ticketIds": null,
  "incidents": null,
  "applications": null,
  "notifications": null,
  "insights": null,
  "notificationMetrics": null,
  "deploymentResourceMapping": null,
  "linkedResourcesViaImageSHA": null
}

---


### 2.2 Search Changelogs
**Endpoint:** `GET /client/changelog/search`  
**Purpose:** Searches and retrieves change log entries

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/changelog/search?page=1&page_size=3" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.[0]'
```

**Sample Response:**
{
  "id": "67ce245863a93d70af9c8606faad1736",
  "providerKey": "kubernetes",
  "createDate": "2025-11-21T19:36:05.951570519Z",
  "derivedType": "Deleted",
  "eventType": "Deleted",
  "providerConfigurationId": 633,
  "sourceIp": "",
  "severity": "Low",
  "source": "Kubernetes",
  "isActorHuman": false,
  "changelog_resource": [
    {
      "id": 0,
      "resourceId": 47501402,
      "sourceSystem": "Kubernetes",
      "isActive": true,
      "createdAt": null,
      "updatedAt": "2025-11-21T19:36:05.951570519Z",
      "sourceResourceId": "8cc244ed-3559-48be-92b3-08506bdf539b",
      "derivedResourceId": null,
      "resourceName": "incident-stage-sync-cron-29395890-hr846",
      "resourceType": "Workload",
      "resourceCategory": "CONTAINER_ORCHESTRATOR",
      "resourceSubType": "Pod",
      "resourceCriticality": null,
      "resourceDisplayName": "incident-stage-sync-cron-29395890-hr846",
      "resourceAccountName": null,
      "changelogVmId": "67ce245863a93d70af9c8606faad1736"
    }
  ],
  "changelog_user": null,
  "changelogUserResource": null
}

---


## 3. NOTIFICATIONS

### 3.1 Get All Notifications
**Endpoint:** `GET /client/notification`  
**Purpose:** Gets notifications list for the organization

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/notification?page=1&page_size=3" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.[0]'
```

**Sample Response:**
{
  "count": 562,
  "description": "Ensures EC2 instance metadata is updated to require HttpTokens or disable HttpEndpoint",
  "earliest_date": "2025-11-06T07:11:42.878824Z",
  "last_updated_date": "2025-11-21T19:36:54.113509Z",
  "notifications": [
    {
      "id": 3130970,
      "organizationId": 1,
      "providerConfigurationId": 605,
      "notificationCategory": "Security",
      "notificationStandard": "default",
      "notificationType": "Profiler",
      "notificationStatus": "Open",
      "title": "Insecure EC2 Metadata Options",
      "severity": "Medium",
      "sourceReferenceId": "",
      "resourceId": 44683160,
      "resourceCategory": "Cloud",
      "resourceType": "Cloud",
      "resourceSubType": "AWS::EC2::Instance",
      "description": "Ensures EC2 instance metadata is updated to require HttpTokens or disable HttpEndpoint",
      "standardInConflict": "default",
      "recommendation": "Update instance metadata options to use IMDSv2",
      "risk": "Insecure EC2 metadata options can lead to SSRF attack escalations.",
      "occurrenceDate": "2025-11-06T00:00:00Z",
      "discoveredDate": "2025-11-06T00:00:00Z",
      "ruleId": "insecure_ec2_metadata_options",
      "subRuleId": null,
      "ruleDescription": null,
      "impact": null,
      "resolution": null,
      "locationFilename": "-",
      "endpointDevice": null,
      "patchManagementRules": null,
      "agingDays": 15,
      "isActive": true,
      "createdAt": "2025-11-06T07:22:16.204432Z",
      "updatedAt": "2025-11-21T19:36:54.113509Z",
      "providerKey": "aws",
      "occurrenceVersion": null,
      "resolvedVersion": null,
      "runId": null,
      "actionQuery": null,
      "profilerRuleId": 1493,
      "alertNotificationSent": null,
      "isDisruptive": null,
      "isManualInterventionNeeded": null,
      "userInputRequired": null,
      "impactScore": null,
      "workflowId": null,
      "standardsInConflict": [
        "default_aws"
      ],
      "changelogVmId": "6295140e5f933c032c2f2f0940193c12",
      "organization": null,
      "provider_configuration": null,
      "resource": {
        "id": 44683160,
        "organizationId": 1,
        "orgKey": "dev",
        "resourceId": "i-0ba31b16450ed13e3",
        "resourceName": "i-0ba31b16450ed13e3",
        "resourceCategory": "",
        "resourceStatus": null,
        "resourceCost": null,
        "resourceType": null,
        "resourceSubType": "",
        "resourceOwner": null,
        "resourceRegion": null,
        "resourceAccountName": "",
        "resourceOsName": null,
        "resourceOsVersion": null,
        "resourcePatchStatus": null,
        "resourcePhysicalAddress": null,
        "resourceCriticality": null,
        "isManaged": false,
        "providerId": 1,
        "providerKey": "aws",
        "sourceRefUri": null,
        "sourceRef": null,
        "vpcId": null,
        "metadata": null,
        "tags": null,
        "isActive": false,
        "watch": null,
        "watchLevel": null,
        "key1": null,
        "key2": null,
        "key3": null,
        "key4": null,
        "key5": null,
        "createDate": null,
        "updateDate": null,
        "createdAt": null,
        "updatedAt": null,
        "providerConfigurationId": 605,
        "parentId": null,
        "resourceOwnerId": null,
        "securityPosture": 0,
        "flagged": false,
        "label": null,
        "initiateResolution": null,
        "notifyUsers": null,
        "consumerAccountId": null,
        "metricsMetadata": null,
        "display": null,
        "branches": null,
        "businessService": null,
        "microService": null,
        "cmdbCiId": null,
        "cmdbCiName": null,
        "cmdbCiSourceRef": null,
        "cmdbCiSourceUri": null,
        "cmdbSource": null,
        "publisherId": null,
        "miscellaneous": null,
        "breadcrumb": "",
        "eventNotificationSettings": null,
        "alertNotificationSettings": null,
        "insightNotificationSettings": null,
        "provider": null,
        "organization": null,
        "resource_metadatum": null,
        "change_log": null,
        "user": null,
        "children": null
      },
      "change_log_impact": null,
      "sr_rnotification_mapping": []
    },
    {
      "id": 3131121,
      "organizationId": 1,
      "providerConfigurationId": 605,
      "notificationCategory": "Security",
      "notificationStandard": "default",
      "notificationType": "Profiler",
      "notificationStatus": "Open",
      "title": "Insecure EC2 Metadata Options",
      "severity": "Medium",
      "sourceReferenceId": "",
      "resourceId": 44682937,
      "resourceCategory": "Cloud",
      "resourceType": "Cloud",
      "resourceSubType": "AWS::EC2::Instance",
      "description": "Ensures EC2 instance metadata is updated to require HttpTokens or disable HttpEndpoint",
      "standardInConflict": "default",
      "recommendation": "Update instance metadata options to use IMDSv2",
      "risk": "Insecure EC2 metadata options can lead to SSRF attack escalations.",
      "occurrenceDate": "2025-11-06T00:00:00Z",
      "discoveredDate": "2025-11-06T00:00:00Z",
      "ruleId": "insecure_ec2_metadata_options",
      "subRuleId": null,
      "ruleDescription": null,
      "impact": null,
      "resolution": null,
      "locationFilename": "-",
      "endpointDevice": null,
      "patchManagementRules": null,
      "agingDays": 15,
      "isActive": true,
      "createdAt": "2025-11-06T07:37:26.131006Z",
      "updatedAt": "2025-11-21T19:36:53.362943Z",
      "providerKey": "aws",
      "occurrenceVersion": null,
      "resolvedVersion": null,
      "runId": null,
      "actionQuery": null,
      "profilerRuleId": 1493,
      "alertNotificationSent": null,
      "isDisruptive": null,
      "isManualInterventionNeeded": null,
      "userInputRequired": null,
      "impactScore": null,
      "workflowId": null,
      "standardsInConflict": [
        "default_aws"
      ],
      "changelogVmId": "7f6e1d083cdd248516f3357856107555",
      "organization": null,
      "provider_configuration": null,
      "resource": {
        "id": 44682937,
        "organizationId": 1,
        "orgKey": "dev",
        "resourceId": "i-03f8d3162aa37d5c7",
        "resourceName": "i-03f8d3162aa37d5c7",
        "resourceCategory": "",
        "resourceStatus": null,
        "resourceCost": null,
        "resourceType": null,
        "resourceSubType": "",
        "resourceOwner": null,
        "resourceRegion": null,
        "resourceAccountName": "",
        "resourceOsName": null,
        "resourceOsVersion": null,
        "resourcePatchStatus": null,
        "resourcePhysicalAddress": null,
        "resourceCriticality": null,
        "isManaged": false,
        "providerId": 1,
        "providerKey": "aws",
        "sourceRefUri": null,
        "sourceRef": null,
        "vpcId": null,
        "metadata": null,
        "tags": null,
        "isActive": false,
        "watch": null,
        "watchLevel": null,
        "key1": null,
        "key2": null,
        "key3": null,
        "key4": null,
        "key5": null,
        "createDate": null,
        "updateDate": null,
        "createdAt": null,
        "updatedAt": null,
        "providerConfigurationId": 605,
        "parentId": null,
        "resourceOwnerId": null,
        "securityPosture": 0,
        "flagged": false,
        "label": null,
        "initiateResolution": null,
        "notifyUsers": null,
        "consumerAccountId": null,
        "metricsMetadata": null,
        "display": null,
        "branches": null,
        "businessService": null,
        "microService": null,
        "cmdbCiId": null,
        "cmdbCiName": null,
        "cmdbCiSourceRef": null,
        "cmdbCiSourceUri": null,
        "cmdbSource": null,
        "publisherId": null,
        "miscellaneous": null,
        "breadcrumb": "",
        "eventNotificationSettings": null,
        "alertNotificationSettings": null,
        "insightNotificationSettings": null,
        "provider": null,
        "organization": null,
        "resource_metadatum": null,
        "change_log": null,
        "user": null,
        "children": null
      },
      "change_log_impact": null,
      "sr_rnotification_mapping": []
    },
    {
      "id": 3131087,
      "organizationId": 1,
      "providerConfigurationId": 605,
      "notificationCategory": "Security",
      "notificationStandard": "default",
      "notificationType": "Profiler",
      "notificationStatus": "Open",
      "title": "Insecure EC2 Metadata Options",
      "severity": "Medium",
      "sourceReferenceId": "",
      "resourceId": 44683157,
      "resourceCategory": "Cloud",
      "resourceType": "Cloud",
      "resourceSubType": "AWS::EC2::Instance",
      "description": "Ensures EC2 instance metadata is updated to require HttpTokens or disable HttpEndpoint",
      "standardInConflict": "default",
      "recommendation": "Update instance metadata options to use IMDSv2",
      "risk": "Insecure EC2 metadata options can lead to SSRF attack escalations.",
      "occurrenceDate": "2025-11-06T00:00:00Z",
      "discoveredDate": "2025-11-06T00:00:00Z",
      "ruleId": "insecure_ec2_metadata_options",
      "subRuleId": null,
      "ruleDescription": null,
      "impact": null,
      "resolution": null,
      "locationFilename": "-",
      "endpointDevice": null,
      "patchManagementRules": null,
      "agingDays": 15,
      "isActive": true,
      "createdAt": "2025-11-06T07:35:23.050604Z",
      "updatedAt": "2025-11-21T19:36:53.043209Z",
      "providerKey": "aws",
      "occurrenceVersion": null,
      "resolvedVersion": null,
      "runId": null,
      "actionQuery": null,
      "profilerRuleId": 1493,
      "alertNotificationSent": null,
      "isDisruptive": null,
      "isManualInterventionNeeded": null,
      "userInputRequired": null,
      "impactScore": null,
      "workflowId": null,
      "standardsInConflict": [
        "default_aws"
      ],
      "changelogVmId": "ff48693043d30969b3c275f42b48dc5f",
      "organization": null,
      "provider_configuration": null,
      "resource": {
        "id": 44683157,
        "organizationId": 1,
        "orgKey": "dev",
        "resourceId": "i-065a02236b9a8c26b",
        "resourceName": "i-065a02236b9a8c26b",
        "resourceCategory": "",
        "resourceStatus": null,
        "resourceCost": null,
        "resourceType": null,
        "resourceSubType": "",
        "resourceOwner": null,
        "resourceRegion": null,
        "resourceAccountName": "",
        "resourceOsName": null,
        "resourceOsVersion": null,
        "resourcePatchStatus": null,
        "resourcePhysicalAddress": null,
        "resourceCriticality": null,
        "isManaged": false,
        "providerId": 1,
        "providerKey": "aws",
        "sourceRefUri": null,
        "sourceRef": null,
        "vpcId": null,
        "metadata": null,
        "tags": null,
        "isActive": false,
        "watch": null,
        "watchLevel": null,
        "key1": null,
        "key2": null,
        "key3": null,
        "key4": null,
        "key5": null,
        "createDate": null,
        "updateDate": null,
        "createdAt": null,
        "updatedAt": null,
        "providerConfigurationId": 605,
        "parentId": null,
        "resourceOwnerId": null,
        "securityPosture": 0,
        "flagged": false,
        "label": null,
        "initiateResolution": null,
        "notifyUsers": null,
        "consumerAccountId": null,
        "metricsMetadata": null,
        "display": null,
        "branches": null,
        "businessService": null,
        "microService": null,
        "cmdbCiId": null,
        "cmdbCiName": null,
        "cmdbCiSourceRef": null,
        "cmdbCiSourceUri": null,
        "cmdbSource": null,
        "publisherId": null,
        "miscellaneous": null,
        "breadcrumb": "",
        "eventNotificationSettings": null,
        "alertNotificationSettings": null,
        "insightNotificationSettings": null,
        "provider": null,
        "organization": null,
        "resource_metadatum": null,
        "change_log": null,
        "user": null,
        "children": null
      },
      "change_log_impact": null,
      "sr_rnotification_mapping": []
    },
    {
      "id": 4800537,
      "organizationId": 1,
      "providerConfigurationId": 605,
      "notificationCategory": "Security",
      "notificationStandard": "default",
      "notificationType": "Profiler",
      "notificationStatus": "Open",
      "title": "Insecure EC2 Metadata Options",
      "severity": "Medium",
      "sourceReferenceId": "",
      "resourceId": 47441991,
      "resourceCategory": "Cloud",
      "resourceType": "Cloud",
      "resourceSubType": "AWS::EC2::Instance",
      "description": "Ensures EC2 instance metadata is updated to require HttpTokens or disable HttpEndpoint",
      "standardInConflict": "default",
      "recommendation": "Update instance metadata options to use IMDSv2",
      "risk": "Insecure EC2 metadata options can lead to SSRF attack escalations.",
      "occurrenceDate": "2025-11-21T00:00:00Z",
      "discoveredDate": "2025-11-21T00:00:00Z",
      "ruleId": "insecure_ec2_metadata_options",
      "subRuleId": null,
      "ruleDescription": null,
      "impact": null,
      "resolution": null,
      "locationFilename": "-",
      "endpointDevice": null,
      "patchManagementRules": null,
      "agingDays": 0,
      "isActive": true,
      "createdAt": "2025-11-21T10:05:26.592853Z",
      "updatedAt": "2025-11-21T19:36:52.16729Z",
      "providerKey": "aws",
      "occurrenceVersion": null,
      "resolvedVersion": null,
      "runId": null,
      "actionQuery": null,
      "profilerRuleId": 1493,
      "alertNotificationSent": null,
      "isDisruptive": null,
      "isManualInterventionNeeded": null,
      "userInputRequired": null,
      "impactScore": null,
      "workflowId": null,
      "standardsInConflict": [
        "default_aws"
      ],
      "changelogVmId": "23f8fcaffbbf65df811a8a55beb661bb",
      "organization": null,
      "provider_configuration": null,
      "resource": {
        "id": 47441991,
        "organizationId": 1,
        "orgKey": "dev",
        "resourceId": "i-037a7efe22234b195",
        "resourceName": "i-037a7efe22234b195",
        "resourceCategory": "",
        "resourceStatus": null,
        "resourceCost": null,
        "resourceType": null,
        "resourceSubType": "",
        "resourceOwner": null,
        "resourceRegion": null,
        "resourceAccountName": "",
        "resourceOsName": null,
        "resourceOsVersion": null,
        "resourcePatchStatus": null,
        "resourcePhysicalAddress": null,
        "resourceCriticality": null,
        "isManaged": false,
        "providerId": 1,
        "providerKey": "aws",
        "sourceRefUri": null,
        "sourceRef": null,
        "vpcId": null,
        "metadata": null,
        "tags": null,
        "isActive": false,
        "watch": null,
        "watchLevel": null,
        "key1": null,
        "key2": null,
        "key3": null,
        "key4": null,
        "key5": null,
        "createDate": null,
        "updateDate": null,
        "createdAt": null,
        "updatedAt": null,
        "providerConfigurationId": 605,
        "parentId": null,
        "resourceOwnerId": null,
        "securityPosture": 0,
        "flagged": false,
        "label": null,
        "initiateResolution": null,
        "notifyUsers": null,
        "consumerAccountId": null,
        "metricsMetadata": null,
        "display": null,
        "branches": null,
        "businessService": null,
        "microService": null,
        "cmdbCiId": null,
        "cmdbCiName": null,
        "cmdbCiSourceRef": null,
        "cmdbCiSourceUri": null,
        "cmdbSource": null,
        "publisherId": null,
        "miscellaneous": null,
        "breadcrumb": "",
        "eventNotificationSettings": null,
        "alertNotificationSettings": null,
        "insightNotificationSettings": null,
        "provider": null,
        "organization": null,
        "resource_metadatum": null,
        "change_log": null,
        "user": null,
        "children": null
      },
      "change_log_impact": null,
      "sr_rnotification_mapping": []
    },
    {
      "id": 4804462,
      "organizationId": 1,
      "providerConfigurationId": 605,
      "notificationCategory": "Security",
      "notificationStandard": "default",
      "notificationType": "Profiler",
      "notificationStatus": "Open",
      "title": "Insecure EC2 Metadata Options",
      "severity": "Medium",
      "sourceReferenceId": "",
      "resourceId": 47444713,
      "resourceCategory": "Cloud",
      "resourceType": "Cloud",
      "resourceSubType": "AWS::EC2::Instance",
      "description": "Ensures EC2 instance metadata is updated to require HttpTokens or disable HttpEndpoint",
      "standardInConflict": "default",
      "recommendation": "Update instance metadata options to use IMDSv2",
      "risk": "Insecure EC2 metadata options can lead to SSRF attack escalations.",
      "occurrenceDate": "2025-11-21T00:00:00Z",
      "discoveredDate": "2025-11-21T00:00:00Z",
      "ruleId": "insecure_ec2_metadata_options",
      "subRuleId": null,
      "ruleDescription": null,
      "impact": null,
      "resolution": null,
      "locationFilename": "-",
      "endpointDevice": null,
      "patchManagementRules": null,
      "agingDays": 0,
      "isActive": true,
      "createdAt": "2025-11-21T10:20:22.857721Z",
      "updatedAt": "2025-11-21T19:36:51.806637Z",
      "providerKey": "aws",
      "occurrenceVersion": null,
      "resolvedVersion": null,
      "runId": null,
      "actionQuery": null,
      "profilerRuleId": 1493,
      "alertNotificationSent": null,
      "isDisruptive": null,
      "isManualInterventionNeeded": null,
      "userInputRequired": null,
      "impactScore": null,
      "workflowId": null,
      "standardsInConflict": [
        "default_aws"
      ],
      "changelogVmId": "abe64f29f4840788e8f6add36c832835",
      "organization": null,
      "provider_configuration": null,
      "resource": {
        "id": 47444713,
        "organizationId": 1,
        "orgKey": "dev",
        "resourceId": "i-0cc7e0fba846881d7",
        "resourceName": "i-0cc7e0fba846881d7",
        "resourceCategory": "",
        "resourceStatus": null,
        "resourceCost": null,
        "resourceType": null,
        "resourceSubType": "",
        "resourceOwner": null,
        "resourceRegion": null,
        "resourceAccountName": "",
        "resourceOsName": null,
        "resourceOsVersion": null,
        "resourcePatchStatus": null,
        "resourcePhysicalAddress": null,
        "resourceCriticality": null,
        "isManaged": false,
        "providerId": 1,
        "providerKey": "aws",
        "sourceRefUri": null,
        "sourceRef": null,
        "vpcId": null,
        "metadata": null,
        "tags": null,
        "isActive": false,
        "watch": null,
        "watchLevel": null,
        "key1": null,
        "key2": null,
        "key3": null,
        "key4": null,
        "key5": null,
        "createDate": null,
        "updateDate": null,
        "createdAt": null,
        "updatedAt": null,
        "providerConfigurationId": 605,
        "parentId": null,
        "resourceOwnerId": null,
        "securityPosture": 0,
        "flagged": false,
        "label": null,
        "initiateResolution": null,
        "notifyUsers": null,
        "consumerAccountId": null,
        "metricsMetadata": null,
        "display": null,
        "branches": null,
        "businessService": null,
        "microService": null,
        "cmdbCiId": null,
        "cmdbCiName": null,
        "cmdbCiSourceRef": null,
        "cmdbCiSourceUri": null,
        "cmdbSource": null,
        "publisherId": null,
        "miscellaneous": null,
        "breadcrumb": "",
        "eventNotificationSettings": null,
        "alertNotificationSettings": null,
        "insightNotificationSettings": null,
        "provider": null,
        "organization": null,
        "resource_metadatum": null,
        "change_log": null,
        "user": null,
        "children": null
      },
      "change_log_impact": null,
      "sr_rnotification_mapping": []
    }
  ],
  "rule_id": "insecure_ec2_metadata_options",
  "severity": "Medium",
  "standards": [
    "default_aws"
  ],
  "title": "Insecure EC2 Metadata Options"
}

---


## 4. TICKETS

### 4.1 Get All Tickets
**Endpoint:** `GET /client/ticket`  
**Purpose:** Get all tickets list for the organization

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/ticket?page=1&page_size=3" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.[0]'
```

**Sample Response:**
{
  "id": 4114207,
  "title": "GH - Integrations - JIRA integration is not ingesting data ",
  "description": "{\"version\":1,\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"after integration of Jira - data is not being ingested into Manifest.\"}]}]}",
  "type": "Service Request",
  "organizationId": 1,
  "providerConfigurationId": 596,
  "consumerConfigurationId": null,
  "source": "External",
  "status": "open",
  "priority": "High",
  "category": null,
  "project": "Customer Success",
  "sourceRefUri": "https://manifest-it.atlassian.net/browse/CS-336",
  "sourceRef": "CS-336",
  "isActive": true,
  "srCreatedAt": "2025-10-07T11:43:09.916Z",
  "srUpdatedAt": "2025-10-14T13:24:12.22Z",
  "createdAt": "2025-11-06T07:03:21.91735Z",
  "updatedAt": "2025-11-06T07:03:21.91735Z",
  "tags": [
    "Customer-Defect"
  ],
  "data": null,
  "risk": null,
  "impact": null,
  "requestedBy": null,
  "assignedTo": null,
  "ciServiceId": null,
  "config": null,
  "relatedResources": null,
  "applicationIds": null,
  "approved": null,
  "approvalDescription": null,
  "relatedChangelogs": null,
  "evidence": null,
  "score": null,
  "externalKey": null,
  "externalStatus": "Done",
  "externalPriority": "Highest",
  "parentId": null,
  "attachments": null,
  "inlineImages": null,
  "metadata": {
    "id": "29110",
    "key": "CS-336",
    "self": "https://manifest-it.atlassian.net/rest/api/3/issue/29110",
    "fields": {
      "votes": {
        "self": "https://manifest-it.atlassian.net/rest/api/3/issue/CS-336/votes"
      },
      "labels": [
        "Customer-Defect"
      ],
      "parent": {
        "id": "28692",
        "key": "CS-321",
        "self": "https://manifest-it.atlassian.net/rest/api/3/issue/28692",
        "fields": {
          "status": {
            "id": "10194",
            "name": "Paying Customer",
            "self": "https://manifest-it.atlassian.net/rest/api/3/status/10194",
            "iconUrl": "https://manifest-it.atlassian.net/",
            "statusCategory": {
              "id": 4,
              "key": "indeterminate",
              "name": "In Progress",
              "self": "https://manifest-it.atlassian.net/rest/api/3/statuscategory/4",
              "colorName": "yellow"
            }
          },
          "summary": "Guardant Health - SaaS - CRs / Incidents"
        }
      },
      "status": {
        "id": "10005",
        "name": "Done",
        "self": "https://manifest-it.atlassian.net/rest/api/3/status/10005",
        "iconUrl": "https://manifest-it.atlassian.net/",
        "statusCategory": {
          "id": 3,
          "key": "done",
          "name": "Done",
          "self": "https://manifest-it.atlassian.net/rest/api/3/statuscategory/3",
          "colorName": "green"
        }
      },
      "comment": {
        "total": 2,
        "comments": [
          {
            "id": "12397",
            "body": {
              "type": "doc",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "text": "From an early assessment - it looks like User Credentials - unauthorized - this may be because the user email ID provided in Manifest integration and the user who created the TOKEN could be different. ",
                      "type": "text"
                    }
                  ]
                }
              ],
              "version": 1
            },
            "self": "https://manifest-it.atlassian.net/rest/api/3/issue/29110/comment/12397",
            "author": {
              "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "active": true,
              "timeZone": "Asia/Calcutta",
              "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "avatarUrls": {
                "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
                "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
                "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
                "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
              },
              "accountType": "atlassian",
              "displayName": "Stephen Sheen"
            },
            "created": "2025-10-07T11:44:51.745+0530",
            "updated": "2025-10-07T11:45:19.766+0530",
            "jsdPublic": true,
            "updateAuthor": {
              "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "active": true,
              "timeZone": "Asia/Calcutta",
              "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "avatarUrls": {
                "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
                "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
                "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
                "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
              },
              "accountType": "atlassian",
              "displayName": "Stephen Sheen"
            }
          },
          {
            "id": "12461",
            "body": {
              "type": "doc",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {
                      "text": "the scope was created using API TOKEN WITH SCOPES whereas Manifest integration dictates that user create API TOKEN without predefined scopes. Issue was resolved when new token was created as per integration guide.",
                      "type": "text"
                    }
                  ]
                }
              ],
              "version": 1
            },
            "self": "https://manifest-it.atlassian.net/rest/api/3/issue/29110/comment/12461",
            "author": {
              "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "active": true,
              "timeZone": "Asia/Calcutta",
              "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "avatarUrls": {
                "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
                "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
                "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
                "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
              },
              "accountType": "atlassian",
              "displayName": "Stephen Sheen"
            },
            "created": "2025-10-14T13:24:06.875+0530",
            "updated": "2025-10-14T13:24:06.875+0530",
            "jsdPublic": true,
            "updateAuthor": {
              "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "active": true,
              "timeZone": "Asia/Calcutta",
              "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "avatarUrls": {
                "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
                "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
                "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
                "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
              },
              "accountType": "atlassian",
              "displayName": "Stephen Sheen"
            }
          }
        ],
        "maxResults": 2
      },
      "created": "2025-10-07T11:43:09+0530",
      "creator": {
        "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
        "active": true,
        "timeZone": "Asia/Calcutta",
        "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
        "avatarUrls": {
          "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
          "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
          "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
          "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
        },
        "accountType": "atlassian",
        "displayName": "Stephen Sheen"
      },
      "duedate": "2025-10-08",
      "project": {
        "id": "10001",
        "key": "CS",
        "name": "Customer Success",
        "self": "https://manifest-it.atlassian.net/rest/api/3/project/10001",
        "avatarUrls": {
          "16x16": "https://manifest-it.atlassian.net/rest/api/3/universal_avatar/view/type/project/avatar/10422?size=xsmall",
          "24x24": "https://manifest-it.atlassian.net/rest/api/3/universal_avatar/view/type/project/avatar/10422?size=small",
          "32x32": "https://manifest-it.atlassian.net/rest/api/3/universal_avatar/view/type/project/avatar/10422?size=medium",
          "48x48": "https://manifest-it.atlassian.net/rest/api/3/universal_avatar/view/type/project/avatar/10422"
        },
        "simplified": true,
        "projectTypeKey": "software"
      },
      "summary": "GH - Integrations - JIRA integration is not ingesting data ",
      "updated": "2025-10-14T13:24:12+0530",
      "watches": {
        "self": "https://manifest-it.atlassian.net/rest/api/3/issue/CS-336/watchers",
        "watchCount": 1
      },
      "worklog": {
        "maxResults": 20
      },
      "assignee": {
        "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
        "active": true,
        "timeZone": "Asia/Calcutta",
        "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
        "avatarUrls": {
          "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
          "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
          "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
          "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
        },
        "accountType": "atlassian",
        "displayName": "Stephen Sheen"
      },
      "priority": {
        "id": "1",
        "name": "Highest",
        "self": "https://manifest-it.atlassian.net/rest/api/3/priority/1",
        "iconUrl": "https://manifest-it.atlassian.net/images/icons/priorities/highest_new.svg"
      },
      "reporter": {
        "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
        "active": true,
        "timeZone": "Asia/Calcutta",
        "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
        "avatarUrls": {
          "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
          "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
          "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
          "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
        },
        "accountType": "atlassian",
        "displayName": "Stephen Sheen"
      },
      "issuetype": {
        "id": "10007",
        "name": "Bug",
        "self": "https://manifest-it.atlassian.net/rest/api/3/issuetype/10007",
        "iconUrl": "https://manifest-it.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10303?size=medium",
        "avatarId": 10303,
        "entityId": "ba91b190-8d41-48cf-8a8a-abc1a4c940c7",
        "description": "A problem or error."
      },
      "workratio": -1,
      "resolution": {
        "id": "10000",
        "name": "Done",
        "self": "https://manifest-it.atlassian.net/rest/api/3/resolution/10000",
        "description": "Work has been completed on this issue."
      },
      "description": {
        "type": "doc",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "text": "after integration of Jira - data is not being ingested into Manifest.",
                "type": "text"
              }
            ]
          }
        ],
        "version": 1
      },
      "resolutiondate": "2025-10-14T13:24:12+0530",
      "statuscategorychangedate": "2025-10-14T13:24:12+0530"
    },
    "renderedFields": {
      "votes": null,
      "labels": null,
      "status": null,
      "comment": {
        "self": "https://manifest-it.atlassian.net/rest/api/3/issue/29110/comment",
        "total": 2,
        "startAt": 0,
        "comments": [
          {
            "id": "12397",
            "body": "<p>From an early assessment - it looks like User Credentials - unauthorized - this may be because the user email ID provided in Manifest integration and the user who created the TOKEN could be different. </p>",
            "self": "https://manifest-it.atlassian.net/rest/api/3/issue/29110/comment/12397",
            "author": {
              "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "active": true,
              "timeZone": "Asia/Calcutta",
              "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "avatarUrls": {
                "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
                "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
                "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
                "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
              },
              "accountType": "atlassian",
              "displayName": "Stephen Sheen"
            },
            "created": "07/Oct/25 11:44 AM",
            "updated": "07/Oct/25 11:45 AM",
            "jsdPublic": true,
            "updateAuthor": {
              "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "active": true,
              "timeZone": "Asia/Calcutta",
              "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "avatarUrls": {
                "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
                "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
                "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
                "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
              },
              "accountType": "atlassian",
              "displayName": "Stephen Sheen"
            }
          },
          {
            "id": "12461",
            "body": "<p>the scope was created using API TOKEN WITH SCOPES whereas Manifest integration dictates that user create API TOKEN without predefined scopes. Issue was resolved when new token was created as per integration guide.</p>",
            "self": "https://manifest-it.atlassian.net/rest/api/3/issue/29110/comment/12461",
            "author": {
              "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "active": true,
              "timeZone": "Asia/Calcutta",
              "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "avatarUrls": {
                "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
                "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
                "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
                "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
              },
              "accountType": "atlassian",
              "displayName": "Stephen Sheen"
            },
            "created": "14/Oct/25 1:24 PM",
            "updated": "14/Oct/25 1:24 PM",
            "jsdPublic": true,
            "updateAuthor": {
              "self": "https://manifest-it.atlassian.net/rest/api/3/user?accountId=712020%3A18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "active": true,
              "timeZone": "Asia/Calcutta",
              "accountId": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
              "avatarUrls": {
                "16x16": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/16",
                "24x24": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/24",
                "32x32": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/32",
                "48x48": "https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94/0f77f6de-ba46-4f74-87be-9137aee8ba75/48"
              },
              "accountType": "atlassian",
              "displayName": "Stephen Sheen"
            }
          }
        ],
        "maxResults": 2
      },
      "created": "07/Oct/25 11:43 AM",
      "creator": null,
      "duedate": "08/Oct/25",
      "project": null,
      "summary": null,
      "updated": "14/Oct/25 1:24 PM",
      "watches": null,
      "worklog": {
        "total": 0,
        "startAt": 0,
        "worklogs": [],
        "maxResults": 20
      },
      "assignee": null,
      "priority": null,
      "progress": null,
      "reporter": null,
      "security": null,
      "subtasks": null,
      "versions": null,
      "issuetype": null,
      "timespent": null,
      "workratio": null,
      "attachment": [],
      "components": null,
      "issuelinks": null,
      "lastViewed": null,
      "resolution": null,
      "description": "<p>after integration of Jira - data is not being ingested into Manifest.</p>",
      "environment": "",
      "fixVersions": null,
      "timeestimate": null,
      "timetracking": {},
      "resolutiondate": "14/Oct/25 1:24 PM",
      "statusCategory": null,
      "issuerestriction": null,
      "aggregateprogress": null,
      "customfield_10001": null,
      "customfield_10015": "03/Oct/25",
      "customfield_10016": null,
      "customfield_10019": null,
      "customfield_10020": null,
      "customfield_10021": null,
      "customfield_10030": null,
      "customfield_10037": null,
      "customfield_10151": null,
      "customfield_10184": null,
      "customfield_10185": null,
      "customfield_10219": null,
      "customfield_10283": null,
      "aggregatetimespent": null,
      "timeoriginalestimate": null,
      "aggregatetimeestimate": null,
      "statuscategorychangedate": "14/Oct/25 1:24 PM",
      "aggregatetimeoriginalestimate": null
    }
  },
  "externalLabels": null,
  "sprintName": null,
  "key1": "Bug",
  "key2": null,
  "key3": null,
  "key4": null,
  "key5": null,
  "firstResponseAt": null,
  "resolvedAt": null,
  "resolutionTimeSec": null,
  "activityMatchStatus": null,
  "needAnalysis": false,
  "organization": null,
  "consumer_configuration": null,
  "provider_configuration": {
    "id": 596,
    "providerId": 11,
    "organizationId": 1,
    "orgKey": "dev",
    "providerKey": "jira",
    "pAccountName": "manifest-it.atlassian.net",
    "pAccountNumber": null,
    "pAccountOwner": null,
    "pSubscriptionId": null,
    "pDescription": null,
    "pRef1": "8d43244485aa0890190a8e8700bcf816",
    "pRef2": null,
    "pRef3": null,
    "pRef4": null,
    "pRef5": null,
    "pMetadata": {
      "clientKey": "a20c6f2a-bade-11f0-8a82-4ed2b55c17e4",
      "clientUser": "a221f9be-bade-11f0-8a82-4ed2b55c17e4",
      "consumerUrl": "a22ceba1-bade-11f0-8a82-4ed2b55c17e4"
    },
    "isActive": true,
    "createdAt": "2025-11-06T07:03:01.553759Z",
    "updatedAt": "2025-11-06T07:12:30.69768Z",
    "changeLogOriginDate": "2025-10-07T07:02:54.433Z",
    "vaultId": null,
    "critical": "High",
    "lastSyncAt": null,
    "lastSyncStatus": null,
    "consumerConfigurationId": 64,
    "credType": "Secure",
    "Cprop": {
      "providerKey": "jira",
      "default.region": [],
      "retries": 3,
      "timeoutInMinutes": 0,
      "ingestionFilter": {
        "resourceIngestionFilter": null,
        "changelogIngestionFilter": null
      }
    },
    "resourceSettings": {},
    "changelogSettings": {},
    "insightSettings": {},
    "isDelete": false,
    "costMetrics": {},
    "parentId": null,
    "integrationType": "single",
    "relatedIds": null,
    "eventNotificationSettings": {},
    "alertNotificationSettings": {},
    "insightNotificationSettings": {},
    "vmAlertNotificationSettings": {},
    "user": null,
    "organization": null,
    "provider": null,
    "cron_job": null,
    "accounts": null,
    "consumer_configuration": null
  },
  "service_request_actor": {
    "id": 4114164,
    "serviceRequestId": 4114207,
    "assigneeId": 2184,
    "assigneeSourceRef": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
    "requesterId": 2184,
    "requesterSourceRef": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
    "isActive": true,
    "createdAt": "2025-11-06T07:03:21.932319Z",
    "updatedAt": "2025-11-06T07:03:21.932319Z",
    "watchersIds": null,
    "watchersSourceRef": [],
    "requester_user_profile": null,
    "assignee_user_profile": null
  },
  "service_request_activity": [
    {
      "id": 17765742,
      "serviceRequestId": 4114207,
      "actorId": null,
      "actorSourceRef": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
      "activityType": "Comment",
      "activityDescription": "[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"From an early assessment - it looks like User Credentials - unauthorized - this may be because the user email ID provided in Manifest integration and the user who created the TOKEN could be different. \"}]}]",
      "isActive": true,
      "srActivityCreatedAt": "2025-11-06T07:03:21.940956Z",
      "srActivityUpdatedAt": "2025-11-06T07:03:21.940956Z",
      "createdAt": "2025-11-06T07:03:21.940956Z",
      "updatedAt": "2025-11-06T07:03:21.940956Z",
      "shaSrComments": "1ae1c76890b79bf36eacd7531df03b0f",
      "activitySourceRef": "12397",
      "parentId": null,
      "metadata": null,
      "key1": null,
      "key2": null,
      "key3": null,
      "key4": null,
      "key5": null,
      "actor_user_profile": null,
      "children": null
    },
    {
      "id": 17765743,
      "serviceRequestId": 4114207,
      "actorId": null,
      "actorSourceRef": "712020:18a03a16-a0c4-4c0e-a3c2-eacd1303fb94",
      "activityType": "Comment",
      "activityDescription": "[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"the scope was created using API TOKEN WITH SCOPES whereas Manifest integration dictates that user create API TOKEN without predefined scopes. Issue was resolved when new token was created as per integration guide.\"}]}]",
      "isActive": true,
      "srActivityCreatedAt": "2025-11-06T07:03:21.940956Z",
      "srActivityUpdatedAt": "2025-11-06T07:03:21.940956Z",
      "createdAt": "2025-11-06T07:03:21.940956Z",
      "updatedAt": "2025-11-06T07:03:21.940956Z",
      "shaSrComments": "b0077a544a3c0307dc1df585af5ccc62",
      "activitySourceRef": "12461",
      "parentId": null,
      "metadata": null,
      "key1": null,
      "key2": null,
      "key3": null,
      "key4": null,
      "key5": null,
      "actor_user_profile": null,
      "children": null
    }
  ],
  "ci": null,
  "service": null,
  "children": null
}

---


### 4.2 Search Tickets
**Endpoint:** `GET /client/ticket/search`  
**Purpose:** Searches and retrieves service request records

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/ticket/search?page=1&page_size=3" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.[0]'
```

**Sample Response:**
{
  "id": 5542890,
  "title": "AI Analysis Format Improvements",
  "description": "![image.png](https://uploads.linear.app/3f373b35-222a-473f-8505-c1489ebd8bcd/3fe5bb10-c849-4bb0-9919-f505024dfdde/3fc4df20-11f3-43ec-b4d1-e7b50f6ddd61)\n\nThis could probably be better",
  "type": "Service Request",
  "organizationId": 1,
  "providerConfigurationId": 600,
  "consumerConfigurationId": null,
  "source": "External",
  "status": "In Progress",
  "priority": "none",
  "category": null,
  "project": "",
  "sourceRefUri": "https://linear.app/manifest-it/issue/DES-18/ai-analysis-format-improvements",
  "sourceRef": "756b0555-c1e4-458b-b893-c7f2a7d3d0fd",
  "isActive": true,
  "srCreatedAt": "2025-11-19T23:19:57.576Z",
  "srUpdatedAt": "2025-11-21T18:50:55.108Z",
  "createdAt": "2025-11-21T19:35:03.715174Z",
  "updatedAt": "2025-11-21T19:35:03.715174Z",
  "tags": null,
  "data": null,
  "risk": null,
  "impact": null,
  "requestedBy": null,
  "assignedTo": null,
  "ciServiceId": null,
  "config": null,
  "relatedResources": null,
  "applicationIds": null,
  "approved": null,
  "approvalDescription": null,
  "relatedChangelogs": null,
  "evidence": null,
  "score": null,
  "externalKey": "DES-18",
  "externalStatus": "In Progress",
  "externalPriority": "No priority",
  "parentId": null,
  "attachments": null,
  "inlineImages": null,
  "metadata": {
    "id": "756b0555-c1e4-458b-b893-c7f2a7d3d0fd",
    "url": "https://linear.app/manifest-it/issue/DES-18/ai-analysis-format-improvements",
    "team": {
      "id": "f3e8556f-632b-4d1e-b769-8d998e914d17",
      "key": "DES",
      "icon": "DesignTools",
      "name": "Design",
      "color": "#26b5ce",
      "members": null,
      "private": false,
      "timezone": "Asia/Kolkata",
      "createdAt": "2025-11-03T22:19:44.758Z",
      "updatedAt": "2025-11-21T18:17:59.616Z",
      "archivedAt": null,
      "activeCycle": null,
      "description": null,
      "organization": {
        "id": "3f373b35-222a-473f-8505-c1489ebd8bcd",
        "name": "manifest it",
        "urlKey": "manifest-it",
        "logoUrl": "https://uploads.linear.app/3f373b35-222a-473f-8505-c1489ebd8bcd/c82bb4bd-85f0-4313-aa2b-9343c26b77d3/256x256/ec5509ce-d7b9-493d-983e-855ab45f6970",
        "createdAt": "2023-10-04T06:29:58.534Z",
        "updatedAt": "2025-11-21T18:17:59.631Z"
      },
      "cyclesEnabled": false,
      "scimGroupName": null,
      "slackNewIssue": true,
      "triageEnabled": false,
      "autoClosePeriod": 6,
      "autoCloseStateId": "4de6614a-74c5-41aa-80e0-27a68493047b",
      "autoArchivePeriod": 6,
      "slackIssueComments": true,
      "slackIssueStatuses": true,
      "issueEstimationType": "notUsed",
      "defaultIssueEstimate": 1,
      "issueEstimationExtended": false,
      "issueEstimationAllowZero": false,
      "issueOrderingNoPriorityFirst": false,
      "markedAsDuplicateWorkflowState": {
        "id": "3c78a9ce-19a9-4dd0-be58-39c7e865603b",
        "name": "Duplicate",
        "team": null,
        "type": "",
        "color": "",
        "position": 0,
        "createdAt": null,
        "updatedAt": null,
        "archivedAt": null,
        "description": null
      }
    },
    "cycle": null,
    "state": {
      "id": "600dab63-07f2-4e55-ab58-d151b3810821",
      "name": "In Progress",
      "team": {
        "id": "f3e8556f-632b-4d1e-b769-8d998e914d17",
        "key": "DES",
        "icon": null,
        "name": "Design",
        "color": "",
        "members": null,
        "private": false,
        "timezone": "",
        "createdAt": null,
        "updatedAt": null,
        "archivedAt": null,
        "activeCycle": null,
        "description": null,
        "organization": null,
        "cyclesEnabled": false,
        "scimGroupName": null,
        "slackNewIssue": false,
        "triageEnabled": false,
        "autoClosePeriod": null,
        "autoCloseStateId": null,
        "autoArchivePeriod": 0,
        "slackIssueComments": false,
        "slackIssueStatuses": false,
        "issueEstimationType": "",
        "defaultIssueEstimate": 0,
        "issueEstimationExtended": false,
        "issueEstimationAllowZero": false,
        "issueOrderingNoPriorityFirst": false,
        "markedAsDuplicateWorkflowState": null
      },
      "type": "started",
      "color": "#f2c94c",
      "position": 2,
      "createdAt": "2025-11-03T22:19:44.758Z",
      "updatedAt": "2025-11-03T22:19:44.758Z",
      "archivedAt": null,
      "description": null
    },
    "title": "AI Analysis Format Improvements",
    "labels": {
      "nodes": [],
      "pageInfo": {
        "endCursor": "",
        "hasNextPage": false,
        "startCursor": "",
        "hasPreviousPage": false
      }
    },
    "number": 18,
    "parent": null,
    "creator": {
      "id": "55f8d4d0-6357-40b4-ab32-c28a60b96486",
      "url": "https://linear.app/manifest-it/profiles/carter",
      "name": "Carter Socha",
      "admin": false,
      "email": "carter.socha@manifestit.io",
      "guest": false,
      "active": true,
      "lastSeen": "2025-11-21T19:14:22.746Z",
      "timezone": "America/Los_Angeles",
      "avatarUrl": "https://public.linear.app/55f8d4d0-6357-40b4-ab32-c28a60b96486/fcf399dc-d33e-489a-ada3-4f1e79962f35",
      "createdAt": "2024-10-15T05:36:35.041Z",
      "updatedAt": "2025-09-03T04:17:42.91Z",
      "displayName": "carter",
      "statusEmoji": null,
      "statusLabel": null,
      "calendarHash": null,
      "organization": {
        "id": "3f373b35-222a-473f-8505-c1489ebd8bcd",
        "name": "manifest it",
        "urlKey": "manifest-it",
        "logoUrl": null,
        "createdAt": null,
        "updatedAt": null
      },
      "disableReason": null,
      "statusUntilAt": null,
      "teamMemberships": null,
      "createdIssueCount": 134
    },
    "dueDate": null,
    "history": {
      "nodes": [
        {
          "id": "1a93f1d2-e1c2-4015-b864-36ad34c4f3b5",
          "actor": {
            "id": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
            "url": "",
            "name": "george.chen@manifestit.io",
            "admin": false,
            "email": "george.chen@manifestit.io",
            "guest": false,
            "active": false,
            "lastSeen": null,
            "timezone": "",
            "avatarUrl": null,
            "createdAt": null,
            "updatedAt": null,
            "displayName": "",
            "statusEmoji": null,
            "statusLabel": null,
            "calendarHash": null,
            "organization": null,
            "disableReason": null,
            "statusUntilAt": null,
            "teamMemberships": null,
            "createdIssueCount": 0
          },
          "toState": {
            "id": "db370745-d25e-47b8-96b6-fa8d2f2622b8",
            "name": "Todo",
            "team": null,
            "type": "unstarted",
            "color": "",
            "position": 0,
            "createdAt": null,
            "updatedAt": null,
            "archivedAt": null,
            "description": null
          },
          "createdAt": "2025-11-20T15:58:53.543Z",
          "fromState": {
            "id": "dd71369f-c7e9-470b-9714-31e616e6d39d",
            "name": "Backlog",
            "team": null,
            "type": "backlog",
            "color": "",
            "position": 0,
            "createdAt": null,
            "updatedAt": null,
            "archivedAt": null,
            "description": null
          },
          "updatedAt": "2025-11-20T15:59:17.64Z",
          "toAssignee": {
            "id": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
            "url": "",
            "name": "george.chen@manifestit.io",
            "admin": false,
            "email": "george.chen@manifestit.io",
            "guest": false,
            "active": false,
            "lastSeen": null,
            "timezone": "",
            "avatarUrl": null,
            "createdAt": null,
            "updatedAt": null,
            "displayName": "",
            "statusEmoji": null,
            "statusLabel": null,
            "calendarHash": null,
            "organization": null,
            "disableReason": null,
            "statusUntilAt": null,
            "teamMemberships": null,
            "createdIssueCount": 0
          }
        },
        {
          "id": "9cdf67c1-ee44-44a3-b636-f8430b8848ce",
          "actor": {
            "id": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
            "url": "",
            "name": "george.chen@manifestit.io",
            "admin": false,
            "email": "george.chen@manifestit.io",
            "guest": false,
            "active": false,
            "lastSeen": null,
            "timezone": "",
            "avatarUrl": null,
            "createdAt": null,
            "updatedAt": null,
            "displayName": "",
            "statusEmoji": null,
            "statusLabel": null,
            "calendarHash": null,
            "organization": null,
            "disableReason": null,
            "statusUntilAt": null,
            "teamMemberships": null,
            "createdIssueCount": 0
          },
          "toState": {
            "id": "600dab63-07f2-4e55-ab58-d151b3810821",
            "name": "In Progress",
            "team": null,
            "type": "started",
            "color": "",
            "position": 0,
            "createdAt": null,
            "updatedAt": null,
            "archivedAt": null,
            "description": null
          },
          "createdAt": "2025-11-21T18:50:54.976Z",
          "fromState": {
            "id": "db370745-d25e-47b8-96b6-fa8d2f2622b8",
            "name": "Todo",
            "team": null,
            "type": "unstarted",
            "color": "",
            "position": 0,
            "createdAt": null,
            "updatedAt": null,
            "archivedAt": null,
            "description": null
          },
          "updatedAt": "2025-11-21T18:50:54.976Z"
        }
      ],
      "pageInfo": {
        "endCursor": "9cdf67c1-ee44-44a3-b636-f8430b8848ce",
        "hasNextPage": false,
        "startCursor": "1a93f1d2-e1c2-4015-b864-36ad34c4f3b5",
        "hasPreviousPage": false
      }
    },
    "project": null,
    "assignee": {
      "id": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
      "url": "https://linear.app/manifest-it/profiles/george.chen",
      "name": "george.chen@manifestit.io",
      "admin": false,
      "email": "george.chen@manifestit.io",
      "guest": false,
      "active": true,
      "lastSeen": "2025-11-21T19:18:00.695Z",
      "timezone": "America/Los_Angeles",
      "avatarUrl": null,
      "createdAt": "2025-11-01T18:10:14.707Z",
      "updatedAt": "2025-11-04T02:22:04.445Z",
      "displayName": "george.chen",
      "statusEmoji": null,
      "statusLabel": null,
      "calendarHash": null,
      "organization": {
        "id": "3f373b35-222a-473f-8505-c1489ebd8bcd",
        "name": "manifest it",
        "urlKey": "manifest-it",
        "logoUrl": null,
        "createdAt": null,
        "updatedAt": null
      },
      "disableReason": null,
      "statusUntilAt": null,
      "teamMemberships": null,
      "createdIssueCount": 10
    },
    "botActor": null,
    "children": {
      "nodes": [],
      "pageInfo": {
        "endCursor": "",
        "hasNextPage": false,
        "startCursor": "",
        "hasPreviousPage": false
      }
    },
    "comments": {
      "nodes": [],
      "pageInfo": {
        "endCursor": "",
        "hasNextPage": false,
        "startCursor": "",
        "hasPreviousPage": false
      }
    },
    "estimate": null,
    "favorite": null,
    "priority": 0,
    "createdAt": "2025-11-19T23:19:57.576Z",
    "relations": {
      "nodes": [],
      "pageInfo": {
        "endCursor": "",
        "hasNextPage": false,
        "startCursor": "",
        "hasPreviousPage": false
      }
    },
    "snoozedBy": null,
    "sortOrder": 34.1,
    "startedAt": "2025-11-21T18:50:55.073Z",
    "triagedAt": null,
    "updatedAt": "2025-11-21T18:50:55.108Z",
    "branchName": "des-18-ai-analysis-format-improvements",
    "canceledAt": null,
    "identifier": "DES-18",
    "attachments": {
      "nodes": [],
      "pageInfo": {
        "endCursor": "",
        "hasNextPage": false,
        "startCursor": "",
        "hasPreviousPage": false
      }
    },
    "completedAt": null,
    "description": "![image.png](https://uploads.linear.app/3f373b35-222a-473f-8505-c1489ebd8bcd/3fe5bb10-c849-4bb0-9919-f505024dfdde/3fc4df20-11f3-43ec-b4d1-e7b50f6ddd61)\n\nThis could probably be better",
    "subscribers": {
      "nodes": [
        {
          "id": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
          "url": "",
          "name": "george.chen@manifestit.io",
          "admin": false,
          "email": "george.chen@manifestit.io",
          "guest": false,
          "active": true,
          "lastSeen": "2025-11-21T19:18:00.695Z",
          "timezone": "America/Los_Angeles",
          "avatarUrl": null,
          "createdAt": "2025-11-01T18:10:14.707Z",
          "updatedAt": "2025-11-04T02:22:04.445Z",
          "displayName": "george.chen",
          "statusEmoji": null,
          "statusLabel": null,
          "calendarHash": null,
          "organization": null,
          "disableReason": null,
          "statusUntilAt": null,
          "teamMemberships": null,
          "createdIssueCount": 0
        },
        {
          "id": "55f8d4d0-6357-40b4-ab32-c28a60b96486",
          "url": "",
          "name": "Carter Socha",
          "admin": false,
          "email": "carter.socha@manifestit.io",
          "guest": false,
          "active": true,
          "lastSeen": "2025-11-21T19:14:22.746Z",
          "timezone": "America/Los_Angeles",
          "avatarUrl": "https://public.linear.app/55f8d4d0-6357-40b4-ab32-c28a60b96486/fcf399dc-d33e-489a-ada3-4f1e79962f35",
          "createdAt": "2024-10-15T05:36:35.041Z",
          "updatedAt": "2025-09-03T04:17:42.91Z",
          "displayName": "carter",
          "statusEmoji": null,
          "statusLabel": null,
          "calendarHash": null,
          "organization": null,
          "disableReason": null,
          "statusUntilAt": null,
          "teamMemberships": null,
          "createdIssueCount": 0
        }
      ],
      "pageInfo": {
        "endCursor": "55f8d4d0-6357-40b4-ab32-c28a60b96486",
        "hasNextPage": false,
        "startCursor": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
        "hasPreviousPage": false
      }
    },
    "autoClosedAt": null,
    "priorityLabel": "No priority",
    "autoArchivedAt": null,
    "snoozedUntilAt": null,
    "projectMilestone": null,
    "subIssueSortOrder": null,
    "customerTicketCount": 0,
    "externalUserCreator": null,
    "lastAppliedTemplate": null,
    "previousIdentifiers": [],
    "integrationSourceType": null
  },
  "externalLabels": null,
  "sprintName": null,
  "key1": "priority_0",
  "key2": "des-18-ai-analysis-format-improvements",
  "key3": "number_18",
  "key4": null,
  "key5": null,
  "firstResponseAt": null,
  "resolvedAt": null,
  "resolutionTimeSec": null,
  "activityMatchStatus": null,
  "needAnalysis": false,
  "organization": null,
  "consumer_configuration": null,
  "provider_configuration": {
    "id": 600,
    "providerId": 52,
    "organizationId": 1,
    "orgKey": "dev",
    "providerKey": "linear",
    "pAccountName": "manifest it",
    "pAccountNumber": null,
    "pAccountOwner": null,
    "pSubscriptionId": null,
    "pDescription": null,
    "pRef1": "806607fcd61b2b2e397983a08b8623aa",
    "pRef2": null,
    "pRef3": null,
    "pRef4": null,
    "pRef5": null,
    "pMetadata": {
      "apiKey": "bc59826e-bade-11f0-8a82-4ed2b55c17e4"
    },
    "isActive": true,
    "createdAt": "2025-11-06T07:03:45.498902Z",
    "updatedAt": "2025-11-06T07:03:45.498902Z",
    "changeLogOriginDate": "2025-10-07T07:03:42.886Z",
    "vaultId": null,
    "critical": "High",
    "lastSyncAt": null,
    "lastSyncStatus": null,
    "consumerConfigurationId": null,
    "credType": "Normal",
    "Cprop": {
      "providerKey": "linear",
      "default.region": [],
      "retries": 3,
      "timeoutInMinutes": 0,
      "ingestionFilter": {
        "resourceIngestionFilter": null,
        "changelogIngestionFilter": null
      }
    },
    "resourceSettings": {},
    "changelogSettings": {},
    "insightSettings": {},
    "isDelete": false,
    "costMetrics": {},
    "parentId": null,
    "integrationType": "single",
    "relatedIds": null,
    "eventNotificationSettings": {},
    "alertNotificationSettings": {},
    "insightNotificationSettings": {},
    "vmAlertNotificationSettings": {},
    "user": null,
    "organization": null,
    "provider": null,
    "cron_job": null,
    "accounts": null,
    "consumer_configuration": null
  },
  "service_request_actor": {
    "id": 5542038,
    "serviceRequestId": 5542890,
    "assigneeId": 2223,
    "assigneeSourceRef": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
    "requesterId": 2239,
    "requesterSourceRef": "55f8d4d0-6357-40b4-ab32-c28a60b96486",
    "isActive": true,
    "createdAt": "2025-11-19T23:20:01.72757Z",
    "updatedAt": "2025-11-19T23:20:01.72757Z",
    "watchersIds": null,
    "watchersSourceRef": null,
    "requester_user_profile": {
      "id": 2239,
      "userId": 1574,
      "providerKey": "linear",
      "key": "",
      "value": "",
      "isConfirmed": false,
      "createdAt": "2025-11-06T07:16:21.527508Z",
      "updatedAt": "2025-11-06T07:16:21.527508Z",
      "email": "carter.socha@manifestit.io",
      "organizationId": 1,
      "name": "Carter Socha",
      "alias": "carter",
      "role": "member",
      "metadata": {
        "id": "55f8d4d0-6357-40b4-ab32-c28a60b96486",
        "url": "https://linear.app/manifest-it/profiles/carter",
        "name": "Carter Socha",
        "admin": false,
        "email": "carter.socha@manifestit.io",
        "guest": false,
        "active": true,
        "lastSeen": "2025-11-04T23:59:46.262Z",
        "timezone": "America/Los_Angeles",
        "avatarUrl": "https://public.linear.app/55f8d4d0-6357-40b4-ab32-c28a60b96486/fcf399dc-d33e-489a-ada3-4f1e79962f35",
        "createdAt": "2024-10-15T05:36:35.041Z",
        "updatedAt": "2025-09-03T04:17:42.91Z",
        "displayName": "carter",
        "statusEmoji": null,
        "statusLabel": null,
        "calendarHash": null,
        "organization": {
          "id": "3f373b35-222a-473f-8505-c1489ebd8bcd",
          "name": "manifest it",
          "urlKey": "manifest-it",
          "logoUrl": null,
          "createdAt": null,
          "updatedAt": null
        },
        "teamMemberships": null,
        "createdIssueCount": 122
      },
      "profileCreatedAt": "2024-10-15T05:36:35.041Z",
      "sourceRefUri": "https://linear.app/manifest-it/profiles/carter",
      "sourceRef": "55f8d4d0-6357-40b4-ab32-c28a60b96486",
      "providerConfigurationId": 600,
      "organization": null
    },
    "assignee_user_profile": {
      "id": 2223,
      "userId": 1583,
      "providerKey": "linear",
      "key": "",
      "value": "",
      "isConfirmed": false,
      "createdAt": "2025-11-06T07:10:08.19675Z",
      "updatedAt": "2025-11-06T07:10:08.19675Z",
      "email": "george.chen@manifestit.io",
      "organizationId": 1,
      "name": "george.chen@manifestit.io",
      "alias": "george.chen",
      "role": "member",
      "metadata": {
        "id": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
        "url": "https://linear.app/manifest-it/profiles/george.chen",
        "name": "george.chen@manifestit.io",
        "admin": false,
        "email": "george.chen@manifestit.io",
        "guest": false,
        "active": true,
        "lastSeen": "2025-11-06T06:49:28.464Z",
        "timezone": "America/Los_Angeles",
        "avatarUrl": null,
        "createdAt": "2025-11-01T18:10:14.707Z",
        "updatedAt": "2025-11-04T02:22:04.445Z",
        "displayName": "george.chen",
        "statusEmoji": null,
        "statusLabel": null,
        "calendarHash": null,
        "organization": {
          "id": "3f373b35-222a-473f-8505-c1489ebd8bcd",
          "name": "manifest it",
          "urlKey": "manifest-it",
          "logoUrl": null,
          "createdAt": null,
          "updatedAt": null
        },
        "teamMemberships": null,
        "createdIssueCount": 7
      },
      "profileCreatedAt": "2025-11-01T18:10:14.707Z",
      "sourceRefUri": "https://linear.app/manifest-it/profiles/george.chen",
      "sourceRef": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
      "providerConfigurationId": 600,
      "organization": null
    }
  },
  "service_request_activity": [
    {
      "id": 23515668,
      "serviceRequestId": 5542890,
      "actorId": 2223,
      "actorSourceRef": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
      "activityType": "Activity",
      "activityDescription": "george.chen@manifestit.io changed state from 'Backlog' to 'Todo'",
      "isActive": true,
      "srActivityCreatedAt": "2025-11-20T15:58:53.543Z",
      "srActivityUpdatedAt": "2025-11-20T15:59:17.64Z",
      "createdAt": "2025-11-20T16:00:02.7136Z",
      "updatedAt": "2025-11-20T16:00:02.7136Z",
      "shaSrComments": "ca90c95d2e23fe112faef0caadd62390",
      "activitySourceRef": "1a93f1d2-e1c2-4015-b864-36ad34c4f3b5",
      "parentId": null,
      "metadata": null,
      "key1": null,
      "key2": null,
      "key3": null,
      "key4": null,
      "key5": null,
      "actor_user_profile": null,
      "children": null
    },
    {
      "id": 24062492,
      "serviceRequestId": 5542890,
      "actorId": 2223,
      "actorSourceRef": "ee3c68cc-c078-4e18-8102-e250ddb45fc7",
      "activityType": "Activity",
      "activityDescription": "george.chen@manifestit.io changed state from 'Todo' to 'In Progress'",
      "isActive": true,
      "srActivityCreatedAt": "2025-11-21T18:50:54.976Z",
      "srActivityUpdatedAt": "2025-11-21T18:50:54.976Z",
      "createdAt": "2025-11-21T18:55:04.604309Z",
      "updatedAt": "2025-11-21T18:55:04.604309Z",
      "shaSrComments": "e1ef5c4871e5d07fd37ed1dc5b4ebb07",
      "activitySourceRef": "9cdf67c1-ee44-44a3-b636-f8430b8848ce",
      "parentId": null,
      "metadata": null,
      "key1": null,
      "key2": null,
      "key3": null,
      "key4": null,
      "key5": null,
      "actor_user_profile": null,
      "children": null
    }
  ],
  "ci": null,
  "service": null,
  "children": null
}

---


## 5. INCIDENTS

### 5.1 Get All Incidents
**Endpoint:** `GET /client/incident`  
**Purpose:** Gets incidents list for the organization

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/incident?page=1&page_size=3" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.[0]'
```

**Sample Response:**
{
  "id": 415,
  "organizationId": 1,
  "consumerConfigurationId": null,
  "title": "GCP Services are down",
  "source": "Internal",
  "description": "GCP Services are down",
  "severity": "High",
  "status": "New",
  "triggeredBy": "deepak.kumar@manifestit.io",
  "sourceRefUri": null,
  "sourceRef": null,
  "isActive": true,
  "createdAt": "2025-09-17T11:44:01.183427Z",
  "updatedAt": "2025-09-17T11:44:01.183427Z",
  "providerConfigurationId": null,
  "dsDelta": null,
  "dsState": "INIT",
  "resolvedDate": null,
  "assignedDate": null,
  "acknowledgedDate": null,
  "reasoning": null,
  "assigneeSourceRef": null,
  "requesterSourceRef": null,
  "assigneeId": null,
  "requesterId": null,
  "applicationIds": [
    49
  ],
  "config": null,
  "providerkey": null,
  "type": "incident",
  "startedAt": "2025-09-17T11:44:00.15Z",
  "endedAt": "2025-09-17T11:44:00.151Z",
  "involvedUserIds": null,
  "apmLogRequestId": null,
  "apmMetricRequestId": null,
  "apmEventRequestId": null,
  "algorithm": "none",
  "tags": null,
  "priority": null,
  "dueDate": null,
  "resolutionSummary": null,
  "isEscalated": null,
  "customAttributes": null,
  "externalTicketId": null,
  "metadata": null,
  "applicationEnvironmentId": 56,
  "changelogVmId": null,
  "organization": null,
  "consumer_configuration": null,
  "provider_configuration": null,
  "incident_resource_mapping": null,
  "incident_activity": null,
  "incident_analysis": null,
  "requester_user_profile": null,
  "assignee_user_profile": null,
  "application_environment": null
}

---


### 5.2 Search Incidents
**Endpoint:** `GET /client/incident/search`  
**Purpose:** Searches and retrieves incident records

**Test Command:**
```bash
curl -s -X GET "${BASE_URL}/client/incident/search?page=1&page_size=3" \
  -H "Mit-Api-Key: ${MANIFEST_API_KEY}" \
  -H "Mit-Org-Key: dev" | jq '.[0]'
```

**Sample Response:**
{
  "id": 1527,
  "organizationId": 1,
  "consumerConfigurationId": null,
  "title": "Acme-cart-services are down",
  "source": "Internal",
  "description": "Acme-cart-services are down",
  "severity": "High",
  "status": "New",
  "triggeredBy": "madiraju.sai@manifestit.io",
  "sourceRefUri": null,
  "sourceRef": null,
  "isActive": true,
  "createdAt": "2025-11-20T11:22:26.680149Z",
  "updatedAt": "2025-11-20T11:22:26.680149Z",
  "providerConfigurationId": null,
  "dsDelta": null,
  "dsState": "INIT",
  "resolvedDate": null,
  "assignedDate": null,
  "acknowledgedDate": null,
  "reasoning": null,
  "assigneeSourceRef": null,
  "requesterSourceRef": null,
  "assigneeId": null,
  "requesterId": null,
  "applicationIds": [
    174
  ],
  "config": null,
  "providerkey": null,
  "type": "incident",
  "startedAt": "2025-11-20T11:22:26.01Z",
  "endedAt": "2025-11-20T11:22:26.01Z",
  "involvedUserIds": null,
  "apmLogRequestId": null,
  "apmMetricRequestId": null,
  "apmEventRequestId": null,
  "algorithm": "none",
  "tags": null,
  "priority": null,
  "dueDate": null,
  "resolutionSummary": null,
  "isEscalated": null,
  "customAttributes": null,
  "externalTicketId": null,
  "metadata": null,
  "applicationEnvironmentId": 185,
  "changelogVmId": null,
  "organization": null,
  "consumer_configuration": null,
  "provider_configuration": null,
  "incident_resource_mapping": [],
  "incident_activity": null,
  "incident_analysis": null,
  "requester_user_profile": null,
  "assignee_user_profile": null,
  "application_environment": null
}

---





## 7. SUMMARY & KEY FINDINGS

### API Coverage
- ✅ **Resources:** 4 endpoints tested (Get All, Get by ID, Get Tickets, Search)
- ✅ **Changelogs:** 2 endpoints tested (Get All, Search)
- ✅ **Notifications:** 1 endpoint tested (Get All)
- ✅ **Tickets:** 2 endpoints tested (Get All, Search)
- ✅ **Incidents:** 2 endpoints tested (Get All, Search)
- ✅ **Graph:** 1 endpoint tested (Get All Nodes)

### Key Observations

#### 1. Time Filtering Limitations
- **Tickets & Incidents:** NO time-based filtering parameters available
- **Workaround:** API returns most recent records by default
- **Impact:** Users asking for "last 2 days" get ALL recent records

#### 2. Authentication
- **Required Headers:**
  - `Mit-Api-Key`: JWT token (expires April 2026)
  - `Mit-Org-Key`: Organization identifier (e.g., "dev")
- **Status:** ✅ All requests authenticated successfully

#### 3. Pagination
- **Standard Parameters:** `page` (default: 1), `page_size` (default: 20)
- **Available on:** All list endpoints
- **Note:** No total count returned in response

#### 4. Data Structure
- **Resource Fields:** id, name, type, status, createdAt, updatedAt, applications
- **Ticket Fields:** id, title, description, type, status, priority, severity
- **Incident Fields:** Similar to tickets but with additional failure context
- **Common Issue:** Large nested objects can cause context overflow

### Recommendations

1. **For LLM Prompts:**
   - Add explicit warnings: "NEVER use time parameters for tickets/incidents"
   - Include entity extraction examples
   - Distinguish "tickets" from "incidents" clearly

2. **For API Consumers:**
   - Implement client-side filtering for time-based queries
   - Use pagination to manage large datasets
   - Strip unnecessary nested fields to reduce payload size

3. **For Testing:**
   - Test with small page_size (3-5) to verify structure
   - Check both `/client/{resource}` and `/client/{resource}/search` endpoints
   - Validate authentication headers on all requests

---

**Report Generated:** November 21, 2025  
**Total Endpoints Tested:** 12  
**Test Status:** ✅ All endpoints operational  
**API Version:** v1
