<?php

namespace App\Models\Traits;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $tenantId = app()->bound('current_tenant_id')
                ? app('current_tenant_id')
                : null;

            if ($tenantId) {
                $builder->where(
                    $builder->getModel()->getTable() . '.tenant_id',
                    $tenantId
                );
            }
        });

        static::creating(function ($model) {
            if (empty($model->tenant_id)) {
                $tenantId = app()->bound('current_tenant_id')
                    ? app('current_tenant_id')
                    : null;

                if ($tenantId) {
                    $model->tenant_id = $tenantId;
                }
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function scopeWithoutTenant(Builder $builder): Builder
    {
        return $builder->withoutGlobalScope('tenant');
    }
}
