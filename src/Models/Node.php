<?php

namespace KBTech\FileManager\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Node extends Model
{
    use SoftDeletes;

    protected $table = 'fm_nodes';
    protected $guarded = ['id'];
    protected $casts = ['size' => 'integer', 'width' => 'integer', 'height' => 'integer'];

    public function parent() { return $this->belongsTo(self::class, 'parent_id')->withTrashed(); }
    public function children() { return $this->hasMany(self::class, 'parent_id'); }
    public function grants() { return $this->hasMany(Grant::class, 'node_id'); }
    public function isImage(): bool { return str_starts_with($this->mime ?? '', 'image/'); }

    public function isPublic(): bool
    {
        $node = $this;
        $seen = [];
        while ($node) {
            if (isset($seen[$node->id]) || $node->trashed() || $node->visibility !== 'shared') { return false; }
            $seen[$node->id] = true;
            $node = $node->parent;
        }
        return (bool) config('file-manager.public_shared');
    }

    public function url(bool $thumbnail = false): string
    {
        return route($this->isPublic() ? 'file-manager.media' : 'file-manager.content', [
            'id' => $this->id, ...($thumbnail ? ['thumbnail' => 1] : []),
        ]);
    }
}
