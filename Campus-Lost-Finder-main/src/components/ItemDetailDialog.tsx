import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Mail, Package } from "lucide-react";
import { format } from "date-fns";

interface ItemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    title: string;
    description?: string;
    category: string;
    location?: string;
    contactInfo: string;
    imageUrl?: string;
    type: "lost" | "found";
    createdAt: string;
  } | null;
}

export const ItemDetailDialog = ({ open, onOpenChange, item }: ItemDetailDialogProps) => {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {item.title}
            <Badge
              className={
                item.type === "lost"
                  ? "bg-secondary hover:bg-secondary/90"
                  : "bg-accent hover:bg-accent/90"
              }
            >
              {item.type === "lost" ? "Lost" : "Found"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {item.imageUrl ? (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">
              <Package className="h-24 w-24 text-muted-foreground" />
            </div>
          )}

          <div className="space-y-3">
            <div>
              <h4 className="font-semibold mb-1">Category</h4>
              <Badge variant="outline">{item.category}</Badge>
            </div>

            {item.description && (
              <div>
                <h4 className="font-semibold mb-1">Description</h4>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            )}

            {item.location && (
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h4 className="font-semibold">Location</h4>
                  <p className="text-muted-foreground">{item.location}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold">Date</h4>
                <p className="text-muted-foreground">
                  {format(new Date(item.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Contact Information</h4>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    if (item.contactInfo.includes('@')) {
                      window.location.href = `mailto:${item.contactInfo}`;
                    } else {
                      window.location.href = `tel:${item.contactInfo}`;
                    }
                  }}
                >
                  Contact: {item.contactInfo}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
