//
//  publisher.swift
//  opentokswift
//
//  Created by rpc on 27/03/15.
//  Copyright (c) 2015 tokbox. All rights reserved.
//

import Foundation
import opentokc
import opentokcbridge

public class Publisher
{
    var c_publisher: COpaquePointer = COpaquePointer.null()
    var c_publisher_wrapper : OTSPublisherDelegate
    
    public init(name: String)
    {
        c_publisher_wrapper = OTSPublisherDelegate()
        c_publisher = otc_publisher_new(name.cStringUsingEncoding(NSUTF8StringEncoding)!,
            nil,
            c_publisher_wrapper.cCallbackWrapper());
    }
    
    public func cPusblisher() -> COpaquePointer {
        return c_publisher
    }
    
    public var renderFrame : (COpaquePointer) -> () {
        set {
            c_publisher_wrapper.renderFrame = newValue
        }
        get {
            return c_publisher_wrapper.renderFrame
        }
    }
    
}