<?php
// Video Table of Contents API Endpoints
// Add these functions to your existing PHP API or create a new endpoint file

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database connection (adjust according to your existing connection method)
function getDbConnection() {
    $host = 'your-postgresql-host';
    $dbname = 'harfai_lms';
    $user = 'your-username';
    $pass = 'your-password';
    
    $dsn = "pgsql:host={$host};dbname={$dbname};port=5432";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    
    return new PDO($dsn, $user, $pass, $options);
}

$input = json_decode(file_get_contents('php://input'), true);
$method = $input['Method'] ?? $_GET['method'] ?? '';
$data = $input['data'] ?? $input ?? [];

try {
    $pdo = getDbConnection();
    
    switch ($method) {
        case 'get_video_table_contents':
            echo json_encode(getVideoTableContents($pdo, $data));
            break;
            
        case 'save_video_table_contents':
            echo json_encode(saveVideoTableContents($pdo, $data));
            break;
            
        case 'update_video_table_content':
            echo json_encode(updateVideoTableContent($pdo, $data));
            break;
            
        case 'delete_video_table_content':
            echo json_encode(deleteVideoTableContent($pdo, $data));
            break;
            
        case 'reorder_video_table_contents':
            echo json_encode(reorderVideoTableContents($pdo, $data));
            break;
            
        default:
            throw new Exception("Unknown method: $method");
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function getVideoTableContents($pdo, $data) {
    $attachmentId = $data['attachment_id'] ?? null;
    
    if (!$attachmentId) {
        throw new Exception("Attachment ID is required");
    }
    
    $query = "
        SELECT 
            id,
            attachment_id,
            content_name,
            start_timestamp,
            end_timestamp,
            description,
            order_index,
            created_at,
            updated_at
        FROM video_table_contents 
        WHERE attachment_id = :attachment_id 
        ORDER BY order_index ASC, start_timestamp ASC
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([':attachment_id' => $attachmentId]);
    $contents = $stmt->fetchAll();
    
    return [
        'success' => true,
        'output' => $contents,
        'total' => count($contents)
    ];
}

function saveVideoTableContents($pdo, $data) {
    $attachmentId = $data['attachment_id'] ?? null;
    $contentName = $data['content_name'] ?? null;
    $startTimestamp = $data['start_timestamp'] ?? null;
    $endTimestamp = $data['end_timestamp'] ?? null;
    $description = $data['description'] ?? '';
    $orderIndex = $data['order_index'] ?? 0;
    
    if (!$attachmentId || !$contentName || $startTimestamp === null || $endTimestamp === null) {
        throw new Exception("Required fields: attachment_id, content_name, start_timestamp, end_timestamp");
    }
    
    if ($startTimestamp >= $endTimestamp) {
        throw new Exception("Start timestamp must be less than end timestamp");
    }
    
    // Check for overlapping timestamps
    $overlapQuery = "
        SELECT id FROM video_table_contents 
        WHERE attachment_id = :attachment_id 
        AND (
            (start_timestamp <= :start_timestamp AND end_timestamp > :start_timestamp)
            OR (start_timestamp < :end_timestamp AND end_timestamp >= :end_timestamp)
            OR (start_timestamp >= :start_timestamp AND end_timestamp <= :end_timestamp)
        )
    ";
    
    $stmt = $pdo->prepare($overlapQuery);
    $stmt->execute([
        ':attachment_id' => $attachmentId,
        ':start_timestamp' => $startTimestamp,
        ':end_timestamp' => $endTimestamp
    ]);
    
    if ($stmt->rowCount() > 0) {
        throw new Exception("Time range overlaps with existing content");
    }
    
    $query = "
        INSERT INTO video_table_contents 
        (attachment_id, content_name, start_timestamp, end_timestamp, description, order_index)
        VALUES (:attachment_id, :content_name, :start_timestamp, :end_timestamp, :description, :order_index)
        RETURNING id
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([
        ':attachment_id' => $attachmentId,
        ':content_name' => $contentName,
        ':start_timestamp' => $startTimestamp,
        ':end_timestamp' => $endTimestamp,
        ':description' => $description,
        ':order_index' => $orderIndex
    ]);
    
    $result = $stmt->fetch();
    
    return [
        'success' => true,
        'message' => 'Video table content saved successfully',
        'id' => $result['id']
    ];
}

function updateVideoTableContent($pdo, $data) {
    $id = $data['id'] ?? null;
    $contentName = $data['content_name'] ?? null;
    $startTimestamp = $data['start_timestamp'] ?? null;
    $endTimestamp = $data['end_timestamp'] ?? null;
    $description = $data['description'] ?? '';
    $orderIndex = $data['order_index'] ?? 0;
    
    if (!$id) {
        throw new Exception("Content ID is required");
    }
    
    if ($startTimestamp !== null && $endTimestamp !== null && $startTimestamp >= $endTimestamp) {
        throw new Exception("Start timestamp must be less than end timestamp");
    }
    
    // Get current record
    $currentQuery = "SELECT * FROM video_table_contents WHERE id = :id";
    $stmt = $pdo->prepare($currentQuery);
    $stmt->execute([':id' => $id]);
    $current = $stmt->fetch();
    
    if (!$current) {
        throw new Exception("Content not found");
    }
    
    // Use current values if not provided
    $contentName = $contentName ?? $current['content_name'];
    $startTimestamp = $startTimestamp ?? $current['start_timestamp'];
    $endTimestamp = $endTimestamp ?? $current['end_timestamp'];
    
    // Check for overlapping timestamps with other records
    $overlapQuery = "
        SELECT id FROM video_table_contents 
        WHERE attachment_id = :attachment_id 
        AND id != :current_id
        AND (
            (start_timestamp <= :start_timestamp AND end_timestamp > :start_timestamp)
            OR (start_timestamp < :end_timestamp AND end_timestamp >= :end_timestamp)
            OR (start_timestamp >= :start_timestamp AND end_timestamp <= :end_timestamp)
        )
    ";
    
    $stmt = $pdo->prepare($overlapQuery);
    $stmt->execute([
        ':attachment_id' => $current['attachment_id'],
        ':current_id' => $id,
        ':start_timestamp' => $startTimestamp,
        ':end_timestamp' => $endTimestamp
    ]);
    
    if ($stmt->rowCount() > 0) {
        throw new Exception("Time range overlaps with existing content");
    }
    
    $query = "
        UPDATE video_table_contents 
        SET content_name = :content_name,
            start_timestamp = :start_timestamp,
            end_timestamp = :end_timestamp,
            description = :description,
            order_index = :order_index,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = :id
    ";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([
        ':id' => $id,
        ':content_name' => $contentName,
        ':start_timestamp' => $startTimestamp,
        ':end_timestamp' => $endTimestamp,
        ':description' => $description,
        ':order_index' => $orderIndex
    ]);
    
    return [
        'success' => true,
        'message' => 'Video table content updated successfully'
    ];
}

function deleteVideoTableContent($pdo, $data) {
    $id = $data['id'] ?? null;
    
    if (!$id) {
        throw new Exception("Content ID is required");
    }
    
    $query = "DELETE FROM video_table_contents WHERE id = :id";
    $stmt = $pdo->prepare($query);
    $stmt->execute([':id' => $id]);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception("Content not found");
    }
    
    return [
        'success' => true,
        'message' => 'Video table content deleted successfully'
    ];
}

function reorderVideoTableContents($pdo, $data) {
    $attachmentId = $data['attachment_id'] ?? null;
    $contentIds = $data['content_ids'] ?? []; // Array of IDs in new order
    
    if (!$attachmentId || empty($contentIds)) {
        throw new Exception("Attachment ID and content IDs array are required");
    }
    
    $pdo->beginTransaction();
    
    try {
        foreach ($contentIds as $index => $contentId) {
            $query = "
                UPDATE video_table_contents 
                SET order_index = :order_index, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND attachment_id = :attachment_id
            ";
            
            $stmt = $pdo->prepare($query);
            $stmt->execute([
                ':order_index' => $index + 1,
                ':id' => $contentId,
                ':attachment_id' => $attachmentId
            ]);
        }
        
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => 'Video table contents reordered successfully'
        ];
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// Helper function to format time in MM:SS format
function formatTimestamp($seconds) {
    $minutes = floor($seconds / 60);
    $remainingSeconds = $seconds % 60;
    return sprintf("%02d:%02d", $minutes, $remainingSeconds);
}

// Helper function to convert MM:SS to seconds
function parseTimestamp($timeString) {
    $parts = explode(':', $timeString);
    if (count($parts) !== 2) {
        throw new Exception("Invalid time format. Use MM:SS");
    }
    
    $minutes = intval($parts[0]);
    $seconds = intval($parts[1]);
    
    return ($minutes * 60) + $seconds;
}
?>
