<?php

namespace KBTech\FileManager\Models;

use Illuminate\Database\Eloquent\Model;

class Grant extends Model
{
    protected $table = 'fm_grants';
    protected $guarded = ['id'];
    protected $casts = ['view' => 'boolean', 'upload' => 'boolean', 'update' => 'boolean', 'delete' => 'boolean'];
}
