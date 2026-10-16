{{- define "stockpilot.fullname" -}}
{{- if contains .Chart.Name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "stockpilot.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
app.kubernetes.io/part-of: stockpilot
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end -}}

{{/* Selector labels for one component: include with (dict "ctx" . "component" "backend") */}}
{{- define "stockpilot.selectorLabels" -}}
app.kubernetes.io/name: stockpilot-{{ .component }}
app.kubernetes.io/instance: {{ .ctx.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "stockpilot.image" -}}
{{- $parts := list -}}
{{- with .root.Values.image.registry }}{{ $parts = append $parts . }}{{ end -}}
{{- with .root.Values.image.owner }}{{ $parts = append $parts . }}{{ end -}}
{{- $parts = append $parts .svc.repository -}}
{{- printf "%s:%s" (join "/" $parts) (toString .svc.tag) -}}
{{- end -}}

{{- define "stockpilot.postgresHost" -}}{{ include "stockpilot.fullname" . }}-postgres{{- end -}}
{{- define "stockpilot.backendService" -}}{{ include "stockpilot.fullname" . }}-backend{{- end -}}
{{- define "stockpilot.frontendService" -}}{{ include "stockpilot.fullname" . }}-frontend{{- end -}}

{{- define "stockpilot.podSecurity" -}}
runAsNonRoot: true
seccompProfile:
  type: RuntimeDefault
{{- end -}}

{{- define "stockpilot.containerSecurity" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
capabilities:
  drop: ["ALL"]
{{- end -}}
