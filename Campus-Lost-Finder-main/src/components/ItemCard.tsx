import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Package } from "lucide-react";
import { format } from "date-fns";

interface ItemCardProps {
  id: string;
  title: string;
  description?: string;
  category: string;
  location?: string;
  imageUrl?: string;
  type: "lost" | "found";
  createdAt: string;
  onContactClick: () => void;
}

export const ItemCard = ({
  title,
  description,
  category,
  location,
  imageUrl,
  type,
  createdAt,
  onContactClick,
}: ItemCardProps) => {
  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
      onClick={onContactClick}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="aspect-square relative overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        <Badge
          className={`absolute top-3 right-3 ${
            type === "lost"
              ? "bg-secondary hover:bg-secondary/90"
              : "bg-accent hover:bg-accent/90"
          }`}
        >
          {type === "lost" ? "Lost" : "Found"}
        </Badge>
      </div>
      
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-lg line-clamp-1">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="outline" className="text-xs">
            {category}
          </Badge>
          {location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{location}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(createdAt), "MMM d, yyyy")}</span>
        </div>
      </div>
    </Card>
  );
};
