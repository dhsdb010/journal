import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Edit2, Trash2, Image as ImageIcon, Type } from "lucide-react";

export type EventType = "happiness" | "sadness" | "fear" | "disgust" | "anger" | "surprise" | "idk" | "so-so";

export type ContentBlock =
  | { type: "text"; content: string; id: string }
  | { type: "image"; content: string; id: string }
  | { type: "video"; content: string; id: string };

export interface CalendarEvent {
  id: string;
  eventType: EventType;
  title: string;
  date: string;
  blocks: ContentBlock[];
}

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  existingEvent: CalendarEvent | null;
  onSave: (event: Omit<CalendarEvent, "id">) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, event: Omit<CalendarEvent, "id">) => void;
}

export function EventModal({
  isOpen,
  onClose,
  selectedDate,
  existingEvent,
  onSave,
  onDelete,
  onUpdate,
}: EventModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [eventType, setEventType] = useState<EventType>("happiness");
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { type: "text", content: "", id: Math.random().toString(36) }
  ]);


  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setTitle("");
      setEventType("happiness");
      setBlocks([{ type: "text", content: "", id: Math.random().toString(36) }]);
    } else if (existingEvent) {
      // Load existing event for viewing
      setEventType(existingEvent.eventType);
      setTitle(existingEvent.title);
      setBlocks(existingEvent.blocks && existingEvent.blocks.length > 0
        ? existingEvent.blocks
        : [{ type: "text", content: "", id: Math.random().toString(36) }]
      );
      setIsEditing(false);
    } else {
      // New event - start in editing mode
      setIsEditing(true);
    }
  }, [isOpen, existingEvent]);

  const handleAddTextBlock = (afterIndex: number) => {
    const newBlock: ContentBlock = {
      type: "text",
      content: "",
      id: Math.random().toString(36)
    };
    const newBlocks = [...blocks];
    newBlocks.splice(afterIndex + 1, 0, newBlock);
    setBlocks(newBlocks);
  };

  const handleAddMediaBlock = (afterIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newBlock: ContentBlock = {
        type: file.type.startsWith("image") ? "image" : "video",
        content: reader.result as string,
        id: Math.random().toString(36)
      };
      const newBlocks = [...blocks];
      newBlocks.splice(afterIndex + 1, 0, newBlock);
      setBlocks(newBlocks);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateBlock = (index: number, content: string) => {
    const newBlocks = [...blocks];
    if (newBlocks[index].type === "text") {
      newBlocks[index] = { ...newBlocks[index], content };
    }
    setBlocks(newBlocks);
  };

  const handleDeleteBlock = (index: number) => {
    if (blocks.length === 1) return; // Keep at least one block
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
  };

  const handleSave = () => {
    if (!selectedDate || !title.trim()) return;

    const eventData = {
      eventType,
      title: title.trim(),
      date: selectedDate,
      blocks: blocks.filter(block =>
        block.type !== "text" || block.content.trim() !== ""
      ),
    };

    if (existingEvent) {
      onUpdate(existingEvent.id, eventData);
    } else {
      onSave(eventData);
    }

    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (existingEvent) {
      // Restore original data
      setEventType(existingEvent.eventType);
      setTitle(existingEvent.title);
      setBlocks(existingEvent.blocks);
      setIsEditing(false);
    } else {
      // Close if it's a new event
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getEventColor = (type: EventType) => {
    switch (type) {
      case "happiness": return "bg-orange-500";
      case "sadness": return "bg-sky-300";
      case "fear": return "bg-yellow-400";
      case "disgust": return "bg-green-300";
      case "anger": return "bg-purple-500";
      case "surprise": return "bg-pink-500";
      case "idk": return "bg-gray-400";
      case "so-so": return "bg-red-500";
    }
  };

  const getEventLabel = (type: EventType) => {
    switch (type) {
      case "happiness": return "Happiness";
      case "sadness": return "Sadness";
      case "fear": return "Fear";
      case "disgust": return "Disgust";
      case "anger": return "Anger";
      case "surprise": return "Surprise";
      case "idk": return "IDK";
      case "so-so": return "So-So";
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-[95vw] md:w-full max-w-2xl max-h-[90vh] overflow-auto">
          <div className="p-6 md:p-8">
            {/* Close button */}
            <Dialog.Close asChild>
              <button className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>

            <Dialog.Description className="sr-only">
              Journal entry for the selected date
            </Dialog.Description>

            {/* Blog View Mode */}
            {!isEditing && existingEvent ? (
              <div className="pb-8">
                {/* Hidden title for accessibility */}
                <Dialog.Title className="sr-only">
                  Journal Entry - {title}
                </Dialog.Title>

                {/* Date */}
                <div className="text-gray-500 text-sm mb-2">
                  {selectedDate && formatDate(selectedDate)}
                </div>

                {/* Feeling Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`w-3 h-3 rounded-full ${getEventColor(eventType)}`} />
                  <span className="text-sm font-medium text-gray-600">
                    {getEventLabel(eventType)}
                  </span>
                </div>

                {/* Title */}
                <h1 className="font-bold text-2xl md:text-3xl mb-6 leading-tight">
                  {title}
                </h1>

                {/* Content Blocks */}
                <div className="space-y-4">
                  {blocks.map((block, index) => (
                    <div key={block.id}>
                      {block.type === "text" ? (
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {block.content}
                        </p>
                      ) : block.type === "image" ? (
                        <img
                          src={block.content}
                          alt={`Content ${index + 1}`}
                          className="w-full rounded-lg"
                        />
                      ) : (
                        <video
                          src={block.content}
                          controls
                          className="w-full rounded-lg"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Edit Button (Sticky at bottom-right of modal) */}
                <div className="sticky bottom-6 flex justify-end mt-8 z-10 pointer-events-none">
                  <button
                    onClick={handleStartEdit}
                    className="w-12 h-12 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 flex items-center justify-center transition-transform hover:scale-110 pointer-events-auto"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-6">
                <Dialog.Title className="text-xl font-bold">
                  {existingEvent ? "Edit Your Day" : "How was your day?"}
                </Dialog.Title>

                {/* Date Display */}
                <div className="text-gray-500 text-sm">
                  {selectedDate && formatDate(selectedDate)}
                </div>

                {/* Feeling Selection */}
                <div>
                  <label className="block mb-3 font-medium">How did you feel?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["happiness", "sadness", "fear", "disgust", "anger", "surprise", "idk", "so-so"] as EventType[]).map(
                      (type) => (
                        <button
                          key={type}
                          onClick={() => setEventType(type)}
                          className={`py-2 px-2 rounded-lg border-2 flex flex-col items-center gap-1 text-xs transition-all ${eventType === type
                            ? "border-black bg-gray-50 scale-105"
                            : "border-gray-200 hover:border-gray-400"
                            }`}
                        >
                          <span className={`w-4 h-4 rounded-full ${getEventColor(type)}`} />
                          <span className="capitalize text-[10px] md:text-xs">{type}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="title" className="block mb-2 font-medium">
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your day a title..."
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                {/* Content Blocks */}
                <div>
                  <label className="block mb-2 font-medium">Your Story</label>
                  <div className="space-y-3">
                    {blocks.map((block, index) => (
                      <div key={block.id} className="group relative">
                        {block.type === "text" ? (
                          <div className="relative">
                            <textarea
                              value={block.content}
                              onChange={(e) => handleUpdateBlock(index, e.target.value)}
                              placeholder="Write your thoughts..."
                              rows={4}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                            />
                            {blocks.length > 1 && (
                              <button
                                onClick={() => handleDeleteBlock(index)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete block"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            {block.type === "image" ? (
                              <img
                                src={block.content}
                                alt={`Block ${index + 1}`}
                                className="w-full rounded-lg border border-gray-300"
                              />
                            ) : (
                              <video
                                src={block.content}
                                controls
                                className="w-full rounded-lg border border-gray-300"
                              />
                            )}
                            <button
                              onClick={() => handleDeleteBlock(index)}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete block"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Add Block Buttons */}
                        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleAddTextBlock(index)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full"
                          >
                            <Type className="w-3 h-3" />
                            Add Text
                          </button>
                          <button
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*,video/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleAddMediaBlock(index, file);
                              };
                              input.click();
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full"
                          >
                            <ImageIcon className="w-3 h-3" />
                            Add Media
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  {existingEvent && (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this entry?")) {
                          onDelete(existingEvent.id);
                          onClose();
                        }
                      }}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!title.trim()}
                    className="flex-1 py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {existingEvent ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}