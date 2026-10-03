<?php

namespace KBTech\FileManager\Services;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Gate;
use KBTech\FileManager\Models\Grant;
use KBTech\FileManager\Models\Node;

class Access
{
    private array $grants = [];

    public function allows(Authenticatable $user, string $ability, ?Node $node = null): bool
    {
        $gate = config('file-manager.gates.'.$ability);
        if ($gate && Gate::has($gate)) { return Gate::forUser($user)->allows($gate, [$node]); }
        if (! $node) { return in_array($ability, ['view', 'upload']); }
        $id = (string) $user->getAuthIdentifier();
        $key = $id;
        $this->grants[$key] ??= Grant::where('user_id', $id)->get()->keyBy('node_id')->all();
        // A private ancestor remains a boundary even when its child is shared.
        $chain = [];
        $current = $node;
        while ($current && ! isset($chain[$current->id])) {
            $chain[$current->id] = $current;
            $current = $current->parent;
        }
        $inherited = false;
        $canView = true;
        foreach (array_reverse($chain, true) as $ancestor) {
            $grant = $this->grants[$key][$ancestor->id] ?? null;
            $inherited = $inherited || ($grant?->view ?? false) || (string) $ancestor->owner_id === $id;
            if ($ancestor->visibility === 'private' && ! $inherited) { $canView = false; break; }
        }
        if (! $canView) { return false; }
        if ($ability === 'view') { return true; }
        if ($ability === 'share') { return (string) $node->owner_id === $id; }
        foreach ($chain as $ancestor) {
            if ((string) $ancestor->owner_id === $id) { return true; }
            $grant = $this->grants[$key][$ancestor->id] ?? null;
            if ($grant && $grant->view && $grant->getAttribute($ability)) { return true; }
        }
        return $ability === 'upload' && $node->visibility === 'shared';
    }

    public function authorize(Authenticatable $user, string $ability, ?Node $node = null): void
    {
        abort_unless($this->allows($user, $ability, $node), 403, 'Bạn không có quyền thực hiện thao tác này.');
    }

    public function permissions(Authenticatable $user, Node $node): array
    {
        return collect(['view', 'upload', 'update', 'delete', 'share'])->mapWithKeys(
            fn ($ability) => [$ability => $this->allows($user, $ability, $node)]
        )->all();
    }
}
